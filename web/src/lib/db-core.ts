import { createClient, type InStatement } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";

import { getDatabaseEnv } from "@/lib/env";
import * as schema from "@/drizzle/schema";

const TRANSIENT_PATTERNS = [
  "other side closed",
  "Connect Timeout Error",
  "SocketError",
  "failed to list objects",
];

function isTransientError(err: unknown): boolean {
  const msg = String(err);
  return TRANSIENT_PATTERNS.some((p) => msg.includes(p));
}

function isAuthError(err: unknown): boolean {
  return /\b401\b/.test(String(err)) || /Unauthorized/i.test(String(err));
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function withDbRetry<T>(fn: () => Promise<T>, maxRetries = 2): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await fn();
    } catch (err) {
      const shouldRetry = attempt < maxRetries && isTransientError(err) && !isAuthError(err);
      if (!shouldRetry) throw err;
      const delay = 100 * Math.pow(2, attempt) + Math.random() * 50;
      await sleep(delay);
    }
  }
}

function patchedFetch(): typeof globalThis.fetch {
  return async (input, init) => {
    const response = await globalThis.fetch(input, init);
    if (response.body && typeof (response.body as unknown as Record<string, unknown>).cancel !== "function") {
      Object.defineProperty(response.body, "cancel", {
        value: () => {},
        writable: false,
      });
    }
    return response;
  };
}

export function getDbClient() {
  const env = getDatabaseEnv();

  if (!env.TURSO_DATABASE_URL || !env.TURSO_AUTH_TOKEN) {
    throw new Error("Turso is not configured yet. Set TURSO_DATABASE_URL and TURSO_AUTH_TOKEN.");
  }

  const client = createClient({
    url: env.TURSO_DATABASE_URL,
    authToken: env.TURSO_AUTH_TOKEN,
    fetch: patchedFetch(),
  });

  const origExecute = client.execute.bind(client);
  client.execute = ((stmt: InStatement | InStatement[] | string) => withDbRetry(() => origExecute(stmt as never))) as typeof client.execute;

  return client;
}

export function getDb() {
  return drizzle(getDbClient(), { schema });
}
