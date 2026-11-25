import { NextRequest } from "next/server";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("@workos-inc/authkit-nextjs", () => ({
  authkit: vi.fn(async () => ({
    headers: new Headers(),
    session: { user: null },
  })),
  partitionAuthkitHeaders: (request: NextRequest) => ({
    requestHeaders: new Headers(request.headers),
    responseHeaders: new Headers(),
  }),
  applyResponseHeaders: (response: unknown) => response,
}));

let proxy: typeof import("@/proxy").proxy;

beforeAll(async () => {
  vi.stubEnv("NODE_ENV", "production");
  vi.stubEnv("RATE_LIMIT_DRIVER", "memory");
  vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://jsquaredadventures.com");
  vi.resetModules();
  ({ proxy } = await import("@/proxy"));
});

afterAll(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

function post(headers: Record<string, string>) {
  return new NextRequest("http://10.50.2.153:3000/admin/save", {
    method: "POST",
    headers,
  });
}

describe("proxy admin CSRF origin allowlist (production)", async () => {
  it("accepts the apex Origin through the tunnel", async () => {
    expect(
      (
        await proxy(
          post({
            origin: "https://jsquaredadventures.com",
            "x-forwarded-host": "jsquaredadventures.com",
            "x-forwarded-proto": "https",
          }),
        )
      ).status,
    ).not.toBe(403);
  });

  it("accepts a forwarded host when x-forwarded-proto is missing", async () => {
    expect(
      (
        await proxy(
          post({
            origin: "https://jsquaredadventures.com",
            "x-forwarded-host": "jsquaredadventures.com",
          }),
        )
      ).status,
    ).not.toBe(403);
  });

  it("rejects an origin that merely echoes an attacker-controlled forwarded host", async () => {
    expect(
      (
        await proxy(
          post({
            origin: "https://evil.example",
            "x-forwarded-host": "evil.example",
            "x-forwarded-proto": "https",
          }),
        )
      ).status,
    ).toBe(400);
  });

  it("rejects a non-allowlisted production origin", async () => {
    expect(
      (
        await proxy(
          post({
            origin: "https://staging.example",
            "x-forwarded-host": "staging.example",
            "x-forwarded-proto": "https",
          }),
        )
      ).status,
    ).toBe(400);
  });
});
