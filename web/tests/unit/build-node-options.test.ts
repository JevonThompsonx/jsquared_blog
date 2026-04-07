import { describe, expect, it } from "vitest";

import { sanitizeNodeOptionsForBuild } from "@/lib/build/sanitize-node-options";

describe("sanitizeNodeOptionsForBuild", () => {
  it("removes inspector flags from NODE_OPTIONS", () => {
    expect(
      sanitizeNodeOptionsForBuild("--enable-source-maps --inspect=127.0.0.1:9229 --inspect-brk --max-old-space-size=4096"),
    ).toBe("--enable-source-maps --max-old-space-size=4096");
  });

  it("returns undefined when only inspector flags are present", () => {
    expect(sanitizeNodeOptionsForBuild("--inspect --inspect-port=0")).toBeUndefined();
  });
});
