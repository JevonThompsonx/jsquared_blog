import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/env-loader", () => ({ loadEnvironmentFiles: () => {} }));

const VALID_WORKOS_ENV = {
  WORKOS_CLIENT_ID: "client_test_123",
  WORKOS_ISSUER: "https://auth.example.test",
  NEXT_PUBLIC_WORKOS_REDIRECT_URI: "https://jsquaredadventures.com/callback",
  WORKOS_COOKIE_PASSWORD: "test-cookie-password-at-least-32-characters",
  WORKOS_COOKIE_MAX_AGE: "1209600",
};

beforeEach(() => {
  vi.resetModules();
  for (const key of Object.keys(VALID_WORKOS_ENV)) {
    vi.stubEnv(key, VALID_WORKOS_ENV[key as keyof typeof VALID_WORKOS_ENV]);
  }
  vi.stubEnv("WORKOS_API_KEY", "");
  vi.stubEnv("WORKOS_COOKIE_DOMAIN", "");
  vi.stubEnv("WORKOS_COOKIE_NAME", "");
  vi.stubEnv("WORKOS_COOKIE_SAMESITE", "");
  vi.stubEnv("NODE_ENV", "test");
  vi.stubEnv("NEXT_PHASE", "phase-production-build");
  vi.stubEnv("TURSO_DATABASE_URL", "file:/tmp/workos-env-test.db");
  vi.stubEnv("AUTH_SECRET", "abcdefghijklmnopqrstuvwxyz123456");
  vi.stubEnv("AUTH_GITHUB_ID", "dummy-github-id");
  vi.stubEnv("AUTH_GITHUB_SECRET", "dummy-github-secret");
  vi.stubEnv("RATE_LIMIT_DRIVER", "memory");
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("WorkOS keyless environment", () => {
  it("validates the public client and the explicit 14-day session lifetime", async () => {
    const { getWorkosEnv } = await import("@/lib/env");

    expect(getWorkosEnv()).toMatchObject({
      clientId: "client_test_123",
      issuer: "https://auth.example.test",
      redirectUri: "https://jsquaredadventures.com/callback",
      cookiePassword: VALID_WORKOS_ENV.WORKOS_COOKIE_PASSWORD,
      cookieMaxAge: 1_209_600,
    });
  });

  it("accepts the supported apex, www, next, and localhost callback origins", async () => {
    const { getWorkosEnv, resetWorkosEnvForTests } = await import("@/lib/env");
    const callbacks = [
      "https://jsquaredadventures.com/callback",
      "https://www.jsquaredadventures.com/callback",
      "https://next.jsquaredadventures.com/callback",
      "http://localhost:3000/callback",
    ];

    for (const redirectUri of callbacks) {
      vi.stubEnv("NEXT_PUBLIC_WORKOS_REDIRECT_URI", redirectUri);
      resetWorkosEnvForTests();
      expect(getWorkosEnv().redirectUri).toBe(redirectUri);
    }
  });

  it("rejects an untrusted callback URI", async () => {
    vi.stubEnv(
      "NEXT_PUBLIC_WORKOS_REDIRECT_URI",
      "https://evil.example/callback",
    );
    const { getWorkosEnv } = await import("@/lib/env");

    expect(() => getWorkosEnv()).toThrow(/callback/i);
  });

  it("rejects a non-HTTPS issuer", async () => {
    vi.stubEnv("WORKOS_ISSUER", "http://auth.example.test");
    const { getWorkosEnv } = await import("@/lib/env");

    expect(() => getWorkosEnv()).toThrow(/issuer/i);
  });

  it("rejects an API key so the runtime cannot silently leave keyless mode", async () => {
    vi.stubEnv("WORKOS_API_KEY", "sk_test_dummy_value");
    const { getWorkosEnv } = await import("@/lib/env");

    expect(() => getWorkosEnv()).toThrow(/keyless|WORKOS_API_KEY/i);
  });

  it("requires an explicit positive session lifetime", async () => {
    const { getWorkosEnv, resetWorkosEnvForTests } = await import("@/lib/env");

    vi.stubEnv("WORKOS_COOKIE_MAX_AGE", "");
    resetWorkosEnvForTests();
    expect(() => getWorkosEnv()).toThrow(/WORKOS_COOKIE_MAX_AGE/);
    vi.stubEnv("WORKOS_COOKIE_MAX_AGE", "3600");
    resetWorkosEnvForTests();
    expect(getWorkosEnv().cookieMaxAge).toBe(3600);
    vi.stubEnv("WORKOS_COOKIE_MAX_AGE", "0");
    resetWorkosEnvForTests();
    expect(() => getWorkosEnv()).toThrow(/WORKOS_COOKIE_MAX_AGE/);
  });

  it.each([
    ["WORKOS_COOKIE_DOMAIN", "jsquaredadventures.com", /WORKOS_COOKIE_DOMAIN/],
    ["WORKOS_COOKIE_NAME", "custom-session", /WORKOS_COOKIE_NAME/],
    ["WORKOS_COOKIE_SAMESITE", "none", /WORKOS_COOKIE_SAMESITE/],
  ])("rejects the cookie override %s", async (key, value, message) => {
    vi.stubEnv(key, value);
    const { getWorkosEnv } = await import("@/lib/env");

    expect(() => getWorkosEnv()).toThrow(message);
  });

  it("caches validated WorkOS env until explicitly reset", async () => {
    const { getWorkosEnv, resetWorkosEnvForTests } = await import("@/lib/env");
    expect(getWorkosEnv().clientId).toBe("client_test_123");
    vi.stubEnv("WORKOS_CLIENT_ID", "client_changed");
    expect(getWorkosEnv().clientId).toBe("client_test_123");
    resetWorkosEnvForTests();
    expect(getWorkosEnv().clientId).toBe("client_changed");
  });
});
