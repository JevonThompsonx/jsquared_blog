import { describe, expect, it } from "vitest";

import { createIsolatedPublicRequestHeaders } from "../e2e/helpers/public-request-headers";

describe("createIsolatedPublicRequestHeaders", () => {
  it("creates a stable loopback x-forwarded-for header for a given scope", () => {
    expect(createIsolatedPublicRequestHeaders("delete-own-comment")).toEqual({
      "x-forwarded-for": "127.0.0.112",
    });
  });

  it("creates different loopback client IPs for different scopes", () => {
    expect(createIsolatedPublicRequestHeaders("post-comment")).not.toEqual(
      createIsolatedPublicRequestHeaders("reply-comment"),
    );
  });

  it("keeps every generated forwarded IP inside the loopback range for current mutation scopes", () => {
    const scopes = [
      "bookmark-post",
      "remove-bookmark",
      "post-comment",
      "reply-comment",
      "like-comment",
      "delete-own-comment",
      "update-profile",
    ];

    const forwardedIps = scopes.map((scope) => createIsolatedPublicRequestHeaders(scope)["x-forwarded-for"]);

    expect(new Set(forwardedIps).size).toBe(scopes.length);
    expect(forwardedIps.every((ip) => /^127\.0\.0\.(?:\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])$/.test(ip))).toBe(true);
  });

  it("normalizes surrounding whitespace before hashing the scope", () => {
    expect(createIsolatedPublicRequestHeaders(" post-comment ")).toEqual(
      createIsolatedPublicRequestHeaders("post-comment"),
    );
  });

  it("rejects empty or whitespace-only scopes", () => {
    expect(() => createIsolatedPublicRequestHeaders(""))
      .toThrowError("Request isolation scope is required");
    expect(() => createIsolatedPublicRequestHeaders("   "))
      .toThrowError("Request isolation scope is required");
  });
});
