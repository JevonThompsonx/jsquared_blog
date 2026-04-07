import { describe, expect, it } from "vitest";

import { createIsolatedPublicRequestHeaders } from "@/lib/e2e/public-request-headers";

describe("createIsolatedPublicRequestHeaders", () => {
  it("creates a stable loopback x-forwarded-for header for a given scope", () => {
    expect(createIsolatedPublicRequestHeaders("delete-own-comment")).toEqual({
      "x-forwarded-for": "127.0.0.142",
    });
  });

  it("creates different loopback client IPs for different scopes", () => {
    expect(createIsolatedPublicRequestHeaders("post-comment")).not.toEqual(
      createIsolatedPublicRequestHeaders("reply-comment"),
    );
  });
});
