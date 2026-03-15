import { describe, expect, it } from "vitest";

import { toPostSlug } from "@/lib/utils";

describe("web migration foundations", () => {
  it("builds a stable post slug", () => {
    expect(toPostSlug({ id: "42", title: "Hello, Coastal Trails!", slug: "" })).toBe("42-hello-coastal-trails");
  });
});
