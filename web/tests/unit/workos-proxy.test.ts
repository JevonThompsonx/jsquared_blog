import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { authkitMock } = vi.hoisted(() => ({ authkitMock: vi.fn() }));

vi.mock("@workos-inc/authkit-nextjs", () => {
  const allowedRequestHeaders = new Set([
    "x-workos-middleware",
    "x-workos-session",
    "x-url",
    "x-redirect-uri",
    "x-sign-up-paths",
  ]);
  const allowedResponseHeaders = new Set([
    "set-cookie",
    "cache-control",
    "vary",
    "www-authenticate",
    "proxy-authenticate",
    "link",
    "x-middleware-cache",
  ]);

  return {
    authkit: authkitMock,
    partitionAuthkitHeaders(request: NextRequest, headers: Headers) {
      const requestHeaders = new Headers(request.headers);
      for (const name of [...requestHeaders.keys()]) {
        const lower = name.toLowerCase();
        if (lower.startsWith("x-workos-") || allowedRequestHeaders.has(lower)) {
          requestHeaders.delete(name);
        }
      }
      for (const [name, value] of headers) {
        if (allowedRequestHeaders.has(name.toLowerCase())) {
          requestHeaders.set(name, value);
        }
      }
      const responseHeaders = new Headers();
      for (const [name, value] of headers) {
        if (allowedResponseHeaders.has(name.toLowerCase())) {
          responseHeaders.append(name, value);
        }
      }
      return { requestHeaders, responseHeaders };
    },
    applyResponseHeaders(
      response: ReturnType<typeof import("next/server").NextResponse.next>,
      headers: Headers,
    ) {
      for (const [name, value] of headers) {
        response.headers.append(name, value);
      }
      return response;
    },
  };
});

import { config, proxy } from "@/proxy";

function authkitHeaders() {
  return new Headers({
    "x-workos-middleware": "1",
    "x-workos-session": "trusted-sealed-session",
    "x-url": "https://jsquaredadventures.com/account",
    "x-redirect-uri": "https://jsquaredadventures.com/callback",
    "x-workos-private": "must-not-leak",
    "set-cookie": "wos-session=trusted; HttpOnly; Secure; SameSite=Lax; Path=/",
    "cache-control": "private, no-store",
  });
}

beforeEach(() => {
  authkitMock.mockReset();
  authkitMock.mockResolvedValue({
    session: { user: null },
    headers: authkitHeaders(),
  });
});

describe("AuthKit proxy composition", () => {
  it("forwards trusted session headers downstream while stripping client spoofing", async () => {
    const request = new NextRequest("https://jsquaredadventures.com/account", {
      headers: {
        cookie: "wos-session=trusted",
        "x-workos-middleware": "spoofed",
        "x-workos-session": "spoofed-session",
        "x-workos-private": "spoofed-private",
      },
    });

    const response = await proxy(request);

    expect(authkitMock).toHaveBeenCalledWith(
      request,
      expect.objectContaining({
        redirectUri: "https://jsquaredadventures.com/callback",
      }),
    );
    expect(
      response.headers.get("x-middleware-request-x-workos-middleware"),
    ).toBe("1");
    expect(response.headers.get("x-middleware-request-x-workos-session")).toBe(
      "trusted-sealed-session",
    );
    expect(
      response.headers.get("x-middleware-request-x-workos-private"),
    ).toBeNull();
    expect(response.headers.get("set-cookie")).toContain("wos-session=trusted");
  });

  it("strips pending PKCE cookies but preserves session refresh cookies", async () => {
    const headers = authkitHeaders();
    headers.append(
      "Set-Cookie",
      "wos-auth-verifier-test=pending; HttpOnly; SameSite=Lax; Path=/",
    );
    headers.set("x-workos-authorization-url", "https://auth.example.test");
    headers.set("x-workos-pkce-state", "sealed-state");
    authkitMock.mockResolvedValue({ session: { user: null }, headers });

    const response = await proxy(
      new NextRequest("https://jsquaredadventures.com/about", {
        headers: { Accept: "text/html" },
      }),
    );

    expect(response.headers.get("set-cookie")).toContain("wos-session=trusted");
    expect(response.headers.get("set-cookie")).not.toContain(
      "wos-auth-verifier",
    );
  });

  it("keeps ordinary anonymous documents publicly revalidatable", async () => {
    const headers = new Headers({
      "x-workos-middleware": "true",
      "x-workos-authorization-url": "https://auth.example.test",
      "x-workos-pkce-state": "pending",
      "set-cookie": "wos-auth-verifier-test=pending; HttpOnly; Path=/",
    });
    authkitMock.mockResolvedValue({ session: { user: null }, headers });

    const response = await proxy(
      new NextRequest("https://jsquaredadventures.com/about", {
        headers: { Accept: "text/html" },
      }),
    );

    expect(response.headers.get("set-cookie")).toBeNull();
    expect(response.headers.get("Cache-Control")).toBe(
      "public, max-age=0, must-revalidate",
    );
  });

  it("uses the approved per-request callback and rejects hostile hosts", async () => {
    await proxy(
      new NextRequest("http://127.0.0.1:3010/about", {
        headers: { "x-forwarded-host": "www.jsquaredadventures.com" },
      }),
    );
    expect(authkitMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        redirectUri: "https://www.jsquaredadventures.com/callback",
      }),
    );

    authkitMock.mockClear();
    const response = await proxy(
      new NextRequest("http://127.0.0.1:3010/about", {
        headers: { host: "evil.example" },
      }),
    );
    expect(response.status).toBe(400);
    expect(authkitMock).not.toHaveBeenCalled();
  });

  it("does not make an authenticated response publicly cacheable", async () => {
    authkitMock.mockResolvedValue({
      session: { user: { id: "user_signed_in" } },
      headers: new Headers({
        "x-workos-middleware": "true",
        "x-workos-session": "trusted-session",
        "cache-control": "private, no-store",
      }),
    });

    const response = await proxy(
      new NextRequest("https://jsquaredadventures.com/about", {
        headers: { cookie: "wos-session=trusted", accept: "text/html" },
      }),
    );

    expect(response.headers.get("Cache-Control")).toContain("no-store");
    expect(response.headers.get("Cache-Control")).not.toContain("public");
  });

  it("never exposes x-workos headers to the browser", async () => {
    const response = await proxy(
      new NextRequest("https://jsquaredadventures.com/account"),
    );

    expect(
      [...response.headers.keys()].filter((name) =>
        name.toLowerCase().startsWith("x-workos-"),
      ),
    ).toEqual([]);
    expect(response.headers.get("x-middleware-request-x-workos-session")).toBe(
      "trusted-sealed-session",
    );
  });

  it("keeps the per-request CSP nonce and reporting headers", async () => {
    const response = await proxy(
      new NextRequest("https://jsquaredadventures.com/"),
    );
    const nonce = response.headers.get("x-middleware-request-x-nonce");
    const csp = response.headers.get("Content-Security-Policy");

    expect(nonce).toBeTruthy();
    expect(csp).toContain(`'nonce-${nonce}'`);
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(response.headers.get("Reporting-Endpoints")).toBe(
      'csp-endpoint="/api/csp-report"',
    );
  });

  it("keeps authenticated pages private and uncached", async () => {
    const response = await proxy(
      new NextRequest("https://jsquaredadventures.com/admin"),
    );

    expect(response.headers.get("Cache-Control")).toContain("no-store");
    expect(response.headers.get("Pragma")).toBe("no-cache");
  });

  it("rejects cross-site admin mutations before invoking AuthKit", async () => {
    const response = await proxy(
      new NextRequest("https://jsquaredadventures.com/admin/save", {
        method: "POST",
        headers: {
          origin: "https://evil.example",
          "sec-fetch-site": "cross-site",
        },
      }),
    );

    expect(response.status).toBe(403);
    expect(authkitMock).not.toHaveBeenCalled();
  });

  it("consumes a safe post-logout return cookie only at the public root", async () => {
    const response = await proxy(
      new NextRequest("https://jsquaredadventures.com/", {
        headers: { cookie: "j2-auth-return=%2Fadmin" },
      }),
    );

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "https://jsquaredadventures.com/admin",
    );
    expect(response.headers.get("set-cookie")).toContain("j2-auth-return=");
    expect(response.headers.get("set-cookie")).toContain("Max-Age=0");
    expect(authkitMock).not.toHaveBeenCalled();
  });

  it("does not exclude prefetch requests from the proxy matcher", () => {
    expect(config.matcher).toEqual([
      {
        source:
          "/((?!_err|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt|xml|json)).*)",
      },
    ]);
  });
});
