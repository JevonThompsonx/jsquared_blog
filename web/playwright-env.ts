import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import { parse } from "dotenv";

const REQUIRED_PLAYWRIGHT_ENV = [
  "TURSO_DATABASE_URL",
  "WORKOS_CLIENT_ID",
  "WORKOS_ISSUER",
  "NEXT_PUBLIC_WORKOS_REDIRECT_URI",
  "WORKOS_COOKIE_PASSWORD",
  "WORKOS_COOKIE_MAX_AGE",
] as const;

/** Load deterministic dummy values without mutating the test process. */
export function loadPlaywrightEnv({
  cwd = process.cwd(),
  overrides = process.env,
}: {
  cwd?: string;
  overrides?: Record<string, string | undefined>;
} = {}): Record<string, string> {
  const examplePath = path.join(cwd, ".env.test.example");
  if (!existsSync(examplePath)) {
    throw new Error(`Missing Playwright dummy env file: ${examplePath}`);
  }

  const defaults = parse(readFileSync(examplePath));
  const env: Record<string, string> = { ...defaults };
  for (const key of Object.keys(defaults)) {
    const value = overrides[key];
    if (value !== undefined) env[key] = value;
  }

  for (const key of REQUIRED_PLAYWRIGHT_ENV) {
    if (!env[key]?.trim()) {
      throw new Error(`Missing required Playwright env: ${key}`);
    }
  }

  return env;
}
