import { test } from "@playwright/test";

import { loadEnvironmentFiles } from "../../../src/lib/env-loader";

loadEnvironmentFiles();

function isPlaceholderTurso(urlValue: string | undefined): boolean {
  if (!urlValue || !urlValue.trim()) {
    return true;
  }
  const value = urlValue.trim();
  // file: URLs are real local SQLite databases — never dummy.
  if (value.startsWith("file:")) {
    return false;
  }
  return /test-db|dummy|example|placeholder|your-[\w-]*\.turso/i.test(value);
}

/** True when DB-backed E2E cannot reach real services (CI dummy env, missing vars). */
export function isDummyDbEnv(): boolean {
  return isPlaceholderTurso(process.env.TURSO_DATABASE_URL);
}

/**
 * File-level quarantine: call at the top of a DB-backed spec (after imports)
 * so the whole file skips — instead of failing — when only dummy/placeholder
 * database URL is configured. Real-cred runs are unaffected.
 */
export function skipIfDummyDbEnv(): void {
  test.skip(
    isDummyDbEnv(),
    "Skipped: no real database configured (dummy/placeholder URL). " +
      "Provide a real TURSO_DATABASE_URL or file: SQLite path to run DB-backed E2E.",
  );
}
