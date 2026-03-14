import { describe, expect, it } from "vitest";

import { getLegacyApiBaseUrl, toPostSlug } from "@/lib/utils";

describe("web migration foundations", () => {
  it("builds a stable post slug", () => {
    expect(toPostSlug({ id: 42, title: "Hello, Coastal Trails!" })).toBe("42-hello-coastal-trails");
  });

  it("falls back to a legacy API URL", () => {
    expect(getLegacyApiBaseUrl()).toBeTruthy();
  });
});
