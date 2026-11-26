import { vi, describe, expect, it } from "vitest";

vi.hoisted(() => {
  (process.env as Record<string, string>).NODE_ENV = "production";
  (process.env as Record<string, string>).RATE_LIMIT_DRIVER = "memory";
  (process.env as Record<string, string>).CRON_SECRET =
    "test-cron-secret-min-16";
  (process.env as Record<string, string>).ADMIN_ALLOWED_EMAILS =
    "admin@example.com";
  (process.env as Record<string, string>).NEXT_PUBLIC_SITE_URL =
    "https://jsquaredadventures.com";
});

import { NextRequest } from "next/server";

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

import { proxy } from "@/proxy";

describe("production CSP", () => {
  it("uses nonce in style-src", async () => {
    const request = new NextRequest(
      "https://jsquaredadventures.com/api/admin/posts",
      {
        method: "POST",
        headers: {
          origin: "https://jsquaredadventures.com",
          "sec-fetch-site": "same-origin",
        },
      },
    );

    const response = await proxy(request);
    const csp = response.headers.get("Content-Security-Policy");

    expect(csp).not.toBeNull();
    expect(csp).toContain("style-src 'self' 'nonce-");
    expect(csp).toContain("style-src-attr 'unsafe-inline'");
    expect(csp).not.toContain("style-src 'self' 'unsafe-inline'");
    // SEC-06 regression: the nonce must be interpolated, not shipped literally.
    expect(csp).not.toContain("${nonce}");
    expect(csp).toMatch(/style-src 'self' 'nonce-[A-Za-z0-9+/=]+'/);
    expect(csp).toContain("upgrade-insecure-requests");
    expect(csp).toContain("'wasm-unsafe-eval'");
    expect(csp).not.toContain("'unsafe-eval'");
  });
});
