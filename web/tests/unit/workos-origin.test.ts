import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/env-loader", () => ({ loadEnvironmentFiles: () => {} }));

beforeEach(() => {
  vi.resetModules();
  vi.stubEnv("NEXT_PHASE", "phase-production-build");
  vi.stubEnv("WORKOS_CLIENT_ID", "client_test_dummy");
  vi.stubEnv(
    "WORKOS_ISSUER",
    "https://auth.example.test/user_management/client_test_dummy",
  );
  vi.stubEnv(
    "NEXT_PUBLIC_WORKOS_REDIRECT_URI",
    "https://jsquaredadventures.com/callback",
  );
  vi.stubEnv(
    "WORKOS_COOKIE_PASSWORD",
    "test-cookie-password-at-least-32-characters",
  );
  vi.stubEnv("WORKOS_COOKIE_MAX_AGE", "1209600");
});

function request(host: string, forwardedHost?: string) {
  const headers: Record<string, string> = { host };
  if (forwardedHost !== undefined) headers["x-forwarded-host"] = forwardedHost;
  return new Request("http://127.0.0.1:3010/api/auth/login", { headers });
}

describe("WorkOS per-request public callback", () => {
  it.each([
    ["jsquaredadventures.com", "https://jsquaredadventures.com/callback"],
    [
      "www.jsquaredadventures.com",
      "https://www.jsquaredadventures.com/callback",
    ],
    [
      "next.jsquaredadventures.com",
      "https://next.jsquaredadventures.com/callback",
    ],
    ["localhost:3000", "http://localhost:3000/callback"],
    ["localhost:3100", "http://localhost:3000/callback"],
    ["127.0.0.1:3199", "http://localhost:3000/callback"],
  ])("uses the approved callback for %s", async (host, expected) => {
    const { getWorkosRequestCallbackURI } = await import("@/lib/env");
    expect(getWorkosRequestCallbackURI(request(host))).toBe(expected);
  });

  it("prefers a validated forwarded host over the internal bind host", async () => {
    const { getWorkosRequestCallbackURI } = await import("@/lib/env");
    expect(
      getWorkosRequestCallbackURI(
        request("127.0.0.1:3010", "www.jsquaredadventures.com"),
      ),
    ).toBe("https://www.jsquaredadventures.com/callback");
  });

  it("falls back to the configured callback only when no host is supplied", async () => {
    const { getWorkosRequestCallbackURI } = await import("@/lib/env");
    expect(
      getWorkosRequestCallbackURI(
        new Request("http://127.0.0.1:3010/api/auth/login"),
      ),
    ).toBe("https://jsquaredadventures.com/callback");
  });

  it.each([
    ["evil.example", undefined],
    ["127.0.0.1:3010", "evil.example"],
    ["jsquaredadventures.com.evil.example", undefined],
    ["jsquaredadventures.com:444", undefined],
  ])(
    "rejects untrusted host %s / forwarded %s",
    async (host, forwardedHost) => {
      const { getWorkosRequestCallbackURI } = await import("@/lib/env");
      expect(() =>
        getWorkosRequestCallbackURI(request(host, forwardedHost)),
      ).toThrow(/untrusted.*host/i);
    },
  );
});
