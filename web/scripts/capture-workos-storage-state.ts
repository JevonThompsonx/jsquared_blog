#!/usr/bin/env node
/**
 * Capture a Playwright storage state using the WorkOS SDK's sealedSession.
 * Operator-only: requires a WorkOS API key and fixture credentials in the shell.
 * Never add that API key to the app environment and never print credentials.
 */

import { chmod, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { WorkOS } from "@workos-inc/node";

import {
  createAdminStorageStateMetadata,
  getAdminStorageStateMetadataPath,
} from "../src/lib/e2e/admin-storage-state-config";

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

type Authenticate = (
  payload: Parameters<WorkOS["userManagement"]["authenticateWithPassword"]>[0],
) => Promise<
  Awaited<ReturnType<WorkOS["userManagement"]["authenticateWithPassword"]>>
>;

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
  password,
  clientId,
  cookiePassword,
  baseURL,
  maxAge,
  authenticate,
}: {
  email: string;
  password: string;
  clientId: string;
  cookiePassword: string;
  baseURL: string;
  maxAge: number;
  authenticate: Authenticate;
}) {
  const response = await authenticate({
    email,
    password,
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
  await mkdir(path.dirname(storageStatePath), { recursive: true });
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
  const apiKey = process.env.WORKOS_API_KEY?.trim();
  const email = process.env.E2E_WORKOS_EMAIL?.trim();
  const password = process.env.E2E_WORKOS_PASSWORD;
  const clientId = process.env.WORKOS_CLIENT_ID?.trim();
  const cookiePassword = process.env.WORKOS_COOKIE_PASSWORD?.trim();
  if (!apiKey || !email || !password || !clientId || !cookiePassword) {
    throw new Error(
      "WORKOS_API_KEY, E2E_WORKOS_EMAIL, E2E_WORKOS_PASSWORD, WORKOS_CLIENT_ID, and WORKOS_COOKIE_PASSWORD are required",
    );
  }
  if (cookiePassword.length < 32) {
    throw new Error("WORKOS_COOKIE_PASSWORD must be at least 32 characters");
  }

  const baseURL = process.env.E2E_BASE_URL ?? "http://localhost:3000";
  const maxAge = Number(process.env.WORKOS_COOKIE_MAX_AGE ?? 1_209_600);
  const workos = new WorkOS({ apiKey, clientId });
  const state = await captureWorkosStorageState({
    email,
    password,
    clientId,
    cookiePassword,
    baseURL,
    maxAge,
    authenticate: (payload) =>
      workos.userManagement.authenticateWithPassword(payload),
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
  main().catch((error) => {
    console.error(
      error instanceof Error ? error.message : "WorkOS storage capture failed",
    );
    process.exitCode = 1;
  });
}
