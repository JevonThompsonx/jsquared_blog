#!/usr/bin/env node
/**
 * Apply keyless WorkOS AuthKit settings to an explicitly selected env file.
 * Legacy Better Auth / Auth.js variables are preserved for code rollback.
 * This script never reads a secret attachment and never prints values.
 */

import { randomUUID } from "node:crypto";
import {
  chmod,
  mkdir,
  readFile,
  rename,
  unlink,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

const CALLBACK_URIS = new Set([
  "https://jsquaredadventures.com/callback",
  "https://www.jsquaredadventures.com/callback",
  "https://next.jsquaredadventures.com/callback",
  "http://localhost:3000/callback",
]);

const MANAGED_KEYS = [
  "WORKOS_CLIENT_ID",
  "WORKOS_ISSUER",
  "NEXT_PUBLIC_WORKOS_REDIRECT_URI",
  "WORKOS_COOKIE_PASSWORD",
  "WORKOS_COOKIE_MAX_AGE",
];

function validate(env) {
  if (!env.WORKOS_CLIENT_ID?.trim())
    throw new Error("WORKOS_CLIENT_ID is required");
  if (!env.WORKOS_COOKIE_PASSWORD || env.WORKOS_COOKIE_PASSWORD.length < 32) {
    throw new Error("WORKOS_COOKIE_PASSWORD must be at least 32 characters");
  }
  if (!CALLBACK_URIS.has(env.NEXT_PUBLIC_WORKOS_REDIRECT_URI)) {
    throw new Error(
      "NEXT_PUBLIC_WORKOS_REDIRECT_URI must be an approved callback",
    );
  }

  let issuer;
  try {
    issuer = new URL(env.WORKOS_ISSUER);
  } catch {
    throw new Error("WORKOS_ISSUER must be a valid HTTPS URL");
  }
  if (
    issuer.protocol !== "https:" ||
    issuer.username ||
    issuer.password ||
    issuer.search ||
    issuer.hash
  ) {
    throw new Error(
      "WORKOS_ISSUER must be an HTTPS URL without credentials, query, or hash",
    );
  }

  const maxAge = Number(env.WORKOS_COOKIE_MAX_AGE ?? 1_209_600);
  if (!Number.isInteger(maxAge) || maxAge <= 0 || maxAge > 31_536_000) {
    throw new Error("WORKOS_COOKIE_MAX_AGE must be a positive integer");
  }
  return { ...env, WORKOS_COOKIE_MAX_AGE: String(maxAge) };
}

function formatValue(value) {
  return /^[A-Za-z0-9_./:+-]+$/.test(value) ? value : JSON.stringify(value);
}

export async function applyWorkosEnvToFile({ filePath, env }) {
  const validated = validate(env);
  const existing = await readFile(filePath, "utf8").catch((error) => {
    if (error?.code === "ENOENT") return "";
    throw error;
  });
  const managed = new Set([...MANAGED_KEYS, "WORKOS_API_KEY"]);
  const preserved = existing
    .split(/\r?\n/)
    .filter((line) => {
      const key = line.match(
        /^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=/,
      )?.[1];
      return !key || !managed.has(key);
    })
    .join("\n")
    .replace(/\n+$/, "");

  const block = [
    "# WorkOS AuthKit (keyless runtime; operator scripts may use a key in their shell)",
    ...MANAGED_KEYS.map(
      (key) => `${key}=${formatValue(String(validated[key] ?? ""))}`,
    ),
  ].join("\n");
  const next = `${preserved ? `${preserved}\n\n` : ""}${block}\n`;
  const directory = path.dirname(filePath);
  await mkdir(directory, { recursive: true });
  const temporaryPath = path.join(
    directory,
    `.${path.basename(filePath)}.${randomUUID()}.tmp`,
  );

  try {
    await writeFile(temporaryPath, next, { mode: 0o600 });
    await rename(temporaryPath, filePath);
    await chmod(filePath, 0o600);
  } finally {
    await unlink(temporaryPath).catch(() => {});
  }
}

async function main() {
  const filePath = process.env.WORKOS_ENV_FILE?.trim();
  if (!filePath) {
    throw new Error("Set WORKOS_ENV_FILE to the explicit env file to update");
  }
  await applyWorkosEnvToFile({
    filePath,
    env: Object.fromEntries(
      [...MANAGED_KEYS].map((key) => [key, process.env[key]]),
    ),
  });
  console.info(`[workos] keyless auth environment updated in ${filePath}`);
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  main().catch((error) => {
    console.error(
      error instanceof Error ? error.message : "WorkOS env update failed",
    );
    process.exitCode = 1;
  });
}
