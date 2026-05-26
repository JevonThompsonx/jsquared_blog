import { vi, describe, expect, it } from "vitest";

vi.hoisted(() => {
  (process.env as Record<string, string>).NODE_ENV = "production";
});

import { NextRequest } from "next/server";
import { proxy } from "@/proxy";

describe("production CSP", () => {
  it("uses nonce in style-src", () => {
    const request = new NextRequest("https://jsquaredadventures.com/api/admin/posts", {
      method: "POST",
      headers: {
        origin: "https://jsquaredadventures.com",
        "sec-fetch-site": "same-origin",
      },
    });

    const response = proxy(request);
    const csp = response.headers.get("Content-Security-Policy");

    expect(csp).not.toBeNull();
    expect(csp).toContain("style-src 'self' 'nonce-");
    expect(csp).toContain("style-src-attr 'unsafe-inline'");
    expect(csp).not.toContain("style-src 'self' 'unsafe-inline'");
    expect(csp).toContain("upgrade-insecure-requests");
    expect(csp).toContain("'wasm-unsafe-eval'");
    expect(csp).not.toContain("'unsafe-eval'");
  });
});
