import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { loadPlaywrightEnv } from "../../playwright-env";

const EXAMPLE_ENV = [
  "TURSO_DATABASE_URL=https://test-db.turso.io",
  "WORKOS_CLIENT_ID=client_test_dummy",
  "WORKOS_ISSUER=https://auth.example.test/user_management/client_test_dummy",
  "NEXT_PUBLIC_WORKOS_REDIRECT_URI=https://jsquaredadventures.com/callback",
  "WORKOS_COOKIE_PASSWORD=test-cookie-password-at-least-32-characters",
  "WORKOS_COOKIE_MAX_AGE=1209600",
].join("\n");

let tempDir: string;

beforeEach(async () => {
  tempDir = await mkdtemp(path.join(os.tmpdir(), "j2-playwright-env-"));
  await writeFile(path.join(tempDir, ".env.test.example"), EXAMPLE_ENV);
});

afterEach(async () => {
  await rm(tempDir, { recursive: true, force: true });
});

describe("Playwright dummy environment", () => {
  it("loads deterministic WorkOS values and preserves explicit overrides", () => {
    const env = loadPlaywrightEnv({
      cwd: tempDir,
      overrides: { WORKOS_CLIENT_ID: "client_override" },
    });

    expect(env).toMatchObject({
      TURSO_DATABASE_URL: "https://test-db.turso.io",
      WORKOS_CLIENT_ID: "client_override",
      WORKOS_ISSUER:
        "https://auth.example.test/user_management/client_test_dummy",
      NEXT_PUBLIC_WORKOS_REDIRECT_URI:
        "https://jsquaredadventures.com/callback",
      WORKOS_COOKIE_PASSWORD: "test-cookie-password-at-least-32-characters",
      WORKOS_COOKIE_MAX_AGE: "1209600",
    });
  });

  it("fails fast when a required WorkOS value is missing", async () => {
    await writeFile(
      path.join(tempDir, ".env.test.example"),
      EXAMPLE_ENV.replace("WORKOS_COOKIE_MAX_AGE=1209600", ""),
    );

    expect(() => loadPlaywrightEnv({ cwd: tempDir, overrides: {} })).toThrow(
      /WORKOS_COOKIE_MAX_AGE/,
    );
  });
});
