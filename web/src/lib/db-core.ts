import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";

import { getDatabaseEnv } from "@/lib/env";
import * as schema from "@/drizzle/schema";

export function getDbClient() {
  const env = getDatabaseEnv();

  if (!env.TURSO_DATABASE_URL || !env.TURSO_AUTH_TOKEN) {
    throw new Error("Turso is not configured yet. Set TURSO_DATABASE_URL and TURSO_AUTH_TOKEN.");
  }

  return createClient({
    url: env.TURSO_DATABASE_URL,
    authToken: env.TURSO_AUTH_TOKEN,
  });
}

export function getDb() {
  return drizzle(getDbClient(), { schema });
}
