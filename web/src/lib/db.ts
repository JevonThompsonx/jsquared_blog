import "server-only";

import { getDb as getDbCore, getDbClient as getDbClientCore } from "@/lib/db-core";

// Keep a callable boundary here so unit tests can mock `@/lib/db` without eagerly loading db-core.
export function getDb() {
  return getDbCore();
}

export function getDbClient() {
  return getDbClientCore();
}
