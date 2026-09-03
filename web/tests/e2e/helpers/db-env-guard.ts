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

function isPlaceholderSupabase(urlValue: string | undefined): boolean {
  if (!urlValue || !urlValue.trim()) {
    return true;
  }
  return /test\.supabase\.co|dummy|example|placeholder|your-[\w-]*\.supabase/i.test(
    urlValue.trim(),
  );
}

/** True when DB-backed E2E cannot reach real services (CI dummy env, missing vars). */
export function isDummyDbEnv(): boolean {
  return (
    isPlaceholderTurso(process.env.TURSO_DATABASE_URL) ||
    isPlaceholderSupabase(
      process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL,
    )
  );
}

/**
 * File-level quarantine: call at the top of a DB-backed spec (after imports)
 * so the whole file skips — instead of failing — when only dummy/placeholder
 * Turso/Supabase URLs are configured. Real-cred runs are unaffected.
 */
export function skipIfDummyDbEnv(): void {
  test.skip(
    isDummyDbEnv(),
    "Skipped: no real Turso/Supabase credentials configured (dummy/placeholder DB URLs). " +
      "Provide real TURSO_DATABASE_URL + SUPABASE_URL to run DB-backed E2E.",
  );
}
