import { describe, expect, it } from "vitest";

import { DEFAULT_E2E_BASE_URL } from "@/lib/e2e/base-url";

import {
  DEFAULT_WORKOS_FIXTURE_BASE_URL,
  DEFAULT_WORKOS_FIXTURE_MAX_AGE,
  MAX_WORKOS_FIXTURE_MAX_AGE,
  resolveWorkosFixtureConfig,
  resolveWorkosFixtureMaxAge,
} from "../../scripts/capture-workos-storage-state";

const requiredEnv = {
  WORKOS_API_KEY: "sk_test_dummy",
  E2E_WORKOS_EMAIL: "fixture@example.com",
  WORKOS_CLIENT_ID: "client_test_dummy",
  WORKOS_COOKIE_PASSWORD: "test-cookie-password-at-least-32-characters",
};

describe("WorkOS fixture configuration", () => {
  it("uses port 3100 and a one-hour lifetime without a password env", () => {
    expect(resolveWorkosFixtureConfig(requiredEnv)).toEqual({
      apiKey: requiredEnv.WORKOS_API_KEY,
      email: requiredEnv.E2E_WORKOS_EMAIL,
      clientId: requiredEnv.WORKOS_CLIENT_ID,
      cookiePassword: requiredEnv.WORKOS_COOKIE_PASSWORD,
      baseURL: "http://127.0.0.1:3100",
      maxAge: 3_600,
    });
    expect(DEFAULT_WORKOS_FIXTURE_BASE_URL).toBe(DEFAULT_E2E_BASE_URL);
    expect(DEFAULT_WORKOS_FIXTURE_BASE_URL).toBe("http://127.0.0.1:3100");
    expect(DEFAULT_WORKOS_FIXTURE_MAX_AGE).toBe(3_600);
  });

  it("honors explicit fixture overrides within a safe upper bound", () => {
    expect(
      resolveWorkosFixtureConfig({
        ...requiredEnv,
        E2E_BASE_URL: "https://staging.example.com",
        E2E_WORKOS_MAX_AGE: "120",
      }),
    ).toMatchObject({
      baseURL: "https://staging.example.com",
      maxAge: 120,
    });
    expect(resolveWorkosFixtureMaxAge("999999")).toBe(
      MAX_WORKOS_FIXTURE_MAX_AGE,
    );
  });

  it.each(["", "0", "-1", "1.5", "abc"])(
    "rejects invalid fixture lifetime %j",
    (value) => {
      expect(() => resolveWorkosFixtureMaxAge(value)).toThrow(
        /positive integer/,
      );
    },
  );
});
