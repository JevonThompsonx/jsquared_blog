import { NextRequest } from "next/server";
import { describe, expect, it, vi } from "vitest";

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

function adminPost(
  headers: Record<string, string>,
  url = "http://10.50.2.153:3000/admin/save",
) {
  return new NextRequest(url, { method: "POST", headers });
}

describe("proxy admin CSRF origin check", async () => {
  it("accepts an apex Origin when the origin sees an internal host header", async () => {
    const response = await proxy(
      adminPost({
        origin: "https://jsquaredadventures.com",
        "sec-fetch-site": "same-origin",
        "x-forwarded-host": "jsquaredadventures.com",
        "x-forwarded-proto": "https",
      }),
    );

    expect(response.status).not.toBe(403);
  });

  it("accepts a www Origin when the forwarded host is www", async () => {
    const response = await proxy(
      adminPost({
        origin: "https://www.jsquaredadventures.com",
        "x-forwarded-host": "www.jsquaredadventures.com",
        "x-forwarded-proto": "https",
      }),
    );

    expect(response.status).not.toBe(403);
  });

  it("rejects a cross-site Origin", async () => {
    const response = await proxy(
      adminPost({
        origin: "https://evil.example",
        "x-forwarded-host": "jsquaredadventures.com",
        "x-forwarded-proto": "https",
      }),
    );

    expect(response.status).toBe(403);
  });

  it("rejects a state-changing request with no Origin", async () => {
    const response = await proxy(
      adminPost({
        "x-forwarded-host": "jsquaredadventures.com",
        "x-forwarded-proto": "https",
      }),
    );

    expect(response.status).toBe(403);
  });

  it("rejects an explicitly cross-site fetch even with a matching Origin", async () => {
    const response = await proxy(
      adminPost({
        origin: "https://jsquaredadventures.com",
        "sec-fetch-site": "cross-site",
        "x-forwarded-host": "jsquaredadventures.com",
        "x-forwarded-proto": "https",
      }),
    );

    expect(response.status).toBe(403);
  });

  it("does not block safe GET requests", async () => {
    const request = new NextRequest("http://10.50.2.153:3000/admin", {
      method: "GET",
      headers: { "x-forwarded-host": "jsquaredadventures.com" },
    });

    expect((await proxy(request)).status).not.toBe(403);
  });
});
