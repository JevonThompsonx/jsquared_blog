import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";

import { proxy } from "@/proxy";

describe("middleware security hardening", () => {
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
    expect(csp).toContain("frame-src 'none'");
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
});
