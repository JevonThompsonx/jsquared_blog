import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const consoleInfoSpy = vi.spyOn(console, "info").mockImplementation(() => {});

import { proxy } from "@/proxy";

describe("middleware security hardening", () => {
  afterEach(() => {
    consoleInfoSpy.mockClear();
  });

  it("blocks cross-site admin API mutations", async () => {
    const request = new NextRequest("https://jsquaredadventures.com/api/admin/posts", {
      method: "POST",
      headers: {
        origin: "https://attacker.example",
        "sec-fetch-site": "cross-site",
      },
    });

    const response = proxy(request);

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ error: "Forbidden" });
  });

  it("blocks admin API mutations when provenance headers are absent", async () => {
    const request = new NextRequest("https://jsquaredadventures.com/api/admin/posts", {
      method: "POST",
    });

    const response = proxy(request);

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ error: "Forbidden" });
  });

  it("allows same-origin admin API mutations and applies no-store", () => {
    const request = new NextRequest("https://jsquaredadventures.com/api/admin/posts", {
      method: "POST",
      headers: {
        origin: "https://jsquaredadventures.com",
        "sec-fetch-site": "same-origin",
      },
    });

    const response = proxy(request);
    const csp = response.headers.get("Content-Security-Policy");

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store, max-age=0");
    expect(response.headers.get("Pragma")).toBe("no-cache");
    expect(response.headers.get("Expires")).toBe("0");
    expect(csp).not.toBeNull();
    expect(csp).toContain("script-src-attr 'none'");
    expect(csp).toContain("style-src 'self'");
    expect(csp).toContain("style-src 'self' 'unsafe-inline'");
    expect(csp).not.toContain("style-src-attr");
    expect(csp).toContain("frame-src 'self' https://open.spotify.com");
    expect(csp).toContain("manifest-src 'self'");
  });

  it("does not set no-store headers on non-admin routes", () => {
    const request = new NextRequest("https://jsquaredadventures.com/about", {
      method: "GET",
    });

    const response = proxy(request);

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBeNull();
  });

  it("applies CSP to non-admin routes", () => {
    const request = new NextRequest("https://jsquaredadventures.com/about", {
      method: "GET",
    });

    const response = proxy(request);
    const csp = response.headers.get("Content-Security-Policy");

    expect(csp).not.toBeNull();
    expect(csp).toContain("style-src");
    expect(csp).toContain("script-src");
    expect(csp).toContain("img-src");
    expect(csp).toContain("default-src 'self'");
  });
});

describe("proxy request logging", () => {
  const env = process.env as Record<string, string | undefined>;
  const originalNodeEnv = env.NODE_ENV;

  beforeEach(() => {
    consoleInfoSpy.mockClear();
  });

  afterEach(() => {
    env.NODE_ENV = originalNodeEnv;
  });

  it("does not log when NODE_ENV is not 'production'", () => {
    env.NODE_ENV = "development";
    const request = new NextRequest("https://jsquaredadventures.com/about", { method: "GET" });
    proxy(request);

    expect(consoleInfoSpy).not.toHaveBeenCalled();
  });

  it("logs method, path, status, and duration in production", () => {
    env.NODE_ENV = "production";
    const request = new NextRequest("https://jsquaredadventures.com/about", { method: "GET" });
    const response = proxy(request);

    expect(consoleInfoSpy).toHaveBeenCalledTimes(1);
    const message = consoleInfoSpy.mock.calls[0]?.[0] as string;
    expect(message).toMatch(/^\[proxy\] GET \/about 200 \d+ms$/);
    expect(response.status).toBe(200);
  });

  it("logs the original response status when the proxy short-circuits with 403", () => {
    env.NODE_ENV = "production";
    const request = new NextRequest("https://jsquaredadventures.com/api/admin/posts", {
      method: "POST",
      headers: {
        origin: "https://attacker.example",
        "sec-fetch-site": "cross-site",
      },
    });
    const response = proxy(request);

    expect(response.status).toBe(403);
    const message = consoleInfoSpy.mock.calls[0]?.[0] as string;
    expect(message).toMatch(/^\[proxy\] POST \/api\/admin\/posts 403 \d+ms$/);
  });
});
