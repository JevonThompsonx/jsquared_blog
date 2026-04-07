import { describe, expect, it } from "vitest";

import { canRunAuthenticatedPublicFlows } from "@/lib/e2e/public-authenticated-guard";

describe("canRunAuthenticatedPublicFlows", () => {
  it("returns false when the public storage state is missing", () => {
    expect(canRunAuthenticatedPublicFlows({
      hasPublicStorageState: false,
      configuredPublicEmail: "reader@example.com",
    })).toBe(false);
  });

  it("returns false when the configured fixture email is missing", () => {
    expect(canRunAuthenticatedPublicFlows({
      hasPublicStorageState: true,
      configuredPublicEmail: undefined,
    })).toBe(false);
  });

  it("returns true only when both storage state and fixture email are present", () => {
    expect(canRunAuthenticatedPublicFlows({
      hasPublicStorageState: true,
      configuredPublicEmail: "reader@example.com",
    })).toBe(true);
  });
});
