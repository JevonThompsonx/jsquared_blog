import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";

import { getDatabaseEnv } from "@/lib/env";
import * as schema from "@/drizzle/schema";

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

  return createClient({
    url: env.TURSO_DATABASE_URL,
    authToken: env.TURSO_AUTH_TOKEN,
    fetch: patchedFetch(),
  });
}

export function getDb() {
  return drizzle(getDbClient(), { schema });
}
