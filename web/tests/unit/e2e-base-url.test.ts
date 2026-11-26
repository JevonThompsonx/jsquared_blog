import { describe, expect, it } from "vitest";

import { DEFAULT_E2E_BASE_URL, resolveE2EBaseURL } from "@/lib/e2e/base-url";

describe("E2E base URL", () => {
  it("defaults to the collision-free loopback port", () => {
    expect(DEFAULT_E2E_BASE_URL).toBe("http://127.0.0.1:3100");
    expect(resolveE2EBaseURL(undefined)).toBe(DEFAULT_E2E_BASE_URL);
    expect(resolveE2EBaseURL("")).toBe(DEFAULT_E2E_BASE_URL);
  });

  it("preserves explicit overrides", () => {
    expect(resolveE2EBaseURL(" https://staging.example.com ")).toBe(
      "https://staging.example.com",
    );
  });
});
