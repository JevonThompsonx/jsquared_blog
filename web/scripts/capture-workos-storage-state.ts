#!/usr/bin/env node
/**
 * Capture a Playwright storage state using WorkOS Magic Auth and sealedSession.
 * Operator-only: requires a WorkOS API key and fixture email in the shell.
 * Never add that API key to the app environment and never print credentials,
 * one-time codes, or tokens.
 */

import { chmod, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { WorkOS } from "@workos-inc/node";

import {
  createAdminStorageStateMetadata,
  getAdminStorageStateMetadataPath,
} from "../src/lib/e2e/admin-storage-state-config";
import { DEFAULT_E2E_BASE_URL } from "../src/lib/e2e/base-url";

export const DEFAULT_WORKOS_FIXTURE_BASE_URL = DEFAULT_E2E_BASE_URL;
export const DEFAULT_WORKOS_FIXTURE_MAX_AGE = 3_600;
export const MAX_WORKOS_FIXTURE_MAX_AGE = 86_400;

type WorkosStorageState = {
  cookies: Array<{
    name: string;
    value: string;
    domain: string;
    path: string;
    httpOnly: boolean;
    secure: boolean;
    sameSite: "Lax";
    expires: number;
  }>;
  origins: [];
};

type CreateMagicAuth = (
  payload: Parameters<WorkOS["userManagement"]["createMagicAuth"]>[0],
) => Promise<
  Pick<Awaited<ReturnType<WorkOS["userManagement"]["createMagicAuth"]>>, "code">
>;

type AuthenticateWithMagicAuth = (
  payload: Parameters<WorkOS["userManagement"]["authenticateWithMagicAuth"]>[0],
) => Promise<
  Awaited<ReturnType<WorkOS["userManagement"]["authenticateWithMagicAuth"]>>
>;

export function resolveWorkosFixtureMaxAge(raw?: string): number {
  const value =
    raw === undefined ? DEFAULT_WORKOS_FIXTURE_MAX_AGE : Number(raw);
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new Error("E2E_WORKOS_MAX_AGE must be a positive integer");
  }
  return Math.min(value, MAX_WORKOS_FIXTURE_MAX_AGE);
}

export function resolveWorkosFixtureConfig(
  env: Record<string, string | undefined> = process.env,
) {
  const apiKey = env.WORKOS_API_KEY?.trim();
  const email = env.E2E_WORKOS_EMAIL?.trim();
  const clientId = env.WORKOS_CLIENT_ID?.trim();
  const cookiePassword = env.WORKOS_COOKIE_PASSWORD?.trim();
  if (!apiKey || !email || !clientId || !cookiePassword) {
    throw new Error(
      "WORKOS_API_KEY, E2E_WORKOS_EMAIL, WORKOS_CLIENT_ID, and WORKOS_COOKIE_PASSWORD are required",
    );
  }
  if (cookiePassword.length < 32) {
    throw new Error("WORKOS_COOKIE_PASSWORD must be at least 32 characters");
  }

  return {
    apiKey,
    email,
    clientId,
    cookiePassword,
    baseURL: env.E2E_BASE_URL?.trim() || DEFAULT_WORKOS_FIXTURE_BASE_URL,
    maxAge: resolveWorkosFixtureMaxAge(env.E2E_WORKOS_MAX_AGE),
  };
}

export function createWorkosStorageState({
  sealedSession,
  baseURL,
  maxAge,
  now = new Date(),
}: {
  sealedSession: string;
  baseURL: string;
  maxAge: number;
  now?: Date;
}): WorkosStorageState {
  const url = new URL(baseURL);
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("Fixture baseURL must use HTTP or HTTPS");
  }
  if (
    url.protocol === "http:" &&
    !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)
  ) {
    throw new Error("Fixture baseURL must use HTTPS for non-loopback hosts");
  }
  if (!Number.isInteger(maxAge) || maxAge <= 0) {
    throw new Error("Fixture maxAge must be a positive integer");
  }
  return {
    cookies: [
      {
        name: "wos-session",
        value: sealedSession,
        domain: url.hostname,
        path: "/",
        httpOnly: true,
        secure: url.protocol === "https:",
        sameSite: "Lax",
        expires: Math.floor(now.getTime() / 1000) + maxAge,
      },
    ],
    origins: [],
  };
}

export async function captureWorkosStorageState({
  email,
  clientId,
  cookiePassword,
  baseURL,
  maxAge,
  createMagicAuth,
  authenticateWithMagicAuth,
}: {
  email: string;
  clientId: string;
  cookiePassword: string;
  baseURL: string;
  maxAge: number;
  createMagicAuth: CreateMagicAuth;
  authenticateWithMagicAuth: AuthenticateWithMagicAuth;
}) {
  const magicAuth = await createMagicAuth({ email });
  const code = magicAuth.code.trim();
  if (!/^[a-z0-9]{4,128}$/i.test(code)) {
    throw new Error("WorkOS did not return a valid one-time email code");
  }

  const response = await authenticateWithMagicAuth({
    email,
    code,
    clientId,
    session: { sealSession: true, cookiePassword },
  });
  if (!response.sealedSession) {
    throw new Error("WorkOS did not return a sealed session");
  }
  return createWorkosStorageState({
    sealedSession: response.sealedSession,
    baseURL,
    maxAge,
  });
}

export function resolveWorkosStorageStatePath({
  cwd = process.cwd(),
  env = process.env,
}: {
  cwd?: string;
  env?: NodeJS.ProcessEnv;
} = {}): string {
  const authDirectory = path.resolve(cwd, "playwright", ".auth");
  const configuredPath =
    env.E2E_WORKOS_STORAGE_STATE ?? env.E2E_ADMIN_STORAGE_STATE;
  const storageStatePath = path.resolve(
    cwd,
    configuredPath ?? "playwright/.auth/admin.json",
  );
  const relative = path.relative(authDirectory, storageStatePath);
  if (
    relative.startsWith("..") ||
    path.isAbsolute(relative) ||
    !/^(?:admin|workos)[a-z0-9._-]*\.json$/i.test(
      path.basename(storageStatePath),
    )
  ) {
    throw new Error(
      "E2E_WORKOS_STORAGE_STATE must stay under playwright/.auth and use an admin*.json or workos*.json filename",
    );
  }
  return storageStatePath;
}

export async function writeWorkosStorageStateArtifact({
  state,
  baseURL,
  storageStatePath,
  now = new Date(),
}: {
  state: WorkosStorageState;
  baseURL: string;
  storageStatePath: string;
  now?: Date;
}): Promise<void> {
  const authDirectory = path.dirname(storageStatePath);
  await mkdir(authDirectory, { recursive: true, mode: 0o700 });
  await chmod(authDirectory, 0o700);
  await writeFile(storageStatePath, JSON.stringify(state, null, 2), {
    mode: 0o600,
  });
  await chmod(storageStatePath, 0o600);
  await writeFile(
    getAdminStorageStateMetadataPath(storageStatePath),
    JSON.stringify(
      createAdminStorageStateMetadata({
        origin: new URL(baseURL).origin,
        createdAt: now.toISOString(),
      }),
      null,
      2,
    ),
    { mode: 0o600 },
  );
  await chmod(getAdminStorageStateMetadataPath(storageStatePath), 0o600);
}

async function main() {
  const { apiKey, email, clientId, cookiePassword, baseURL, maxAge } =
    resolveWorkosFixtureConfig();
  const workos = new WorkOS({ apiKey, clientId });
  console.info(
    "[workos] requesting a one-time email code for fixture capture.",
  );
  const state = await captureWorkosStorageState({
    email,
    clientId,
    cookiePassword,
    baseURL,
    maxAge,
    createMagicAuth: (payload) =>
      workos.userManagement.createMagicAuth(payload),
    authenticateWithMagicAuth: (payload) =>
      workos.userManagement.authenticateWithMagicAuth(payload),
  });
  const storageStatePath = resolveWorkosStorageStatePath();
  await writeWorkosStorageStateArtifact({
    state,
    baseURL,
    storageStatePath,
  });
  console.info(`[workos] storage state saved to ${storageStatePath}`);
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  main().catch(() => {
    console.error("WorkOS storage capture failed");
    process.exitCode = 1;
  });
}
