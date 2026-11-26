import { describe, expect, it, vi } from "vitest";

import { rejectCrossSiteMutation } from "@/lib/auth/csrf";

function request(method: string, headers: Record<string, string> = {}) {
  return new Request("https://jsquaredadventures.com/api/account/profile", {
    method,
    headers,
  });
}

describe("rejectCrossSiteMutation", () => {
  it("allows safe methods without an Origin", () => {
    expect(rejectCrossSiteMutation(request("GET"))).toBeNull();
  });

  it("allows a same-origin browser mutation", () => {
    expect(
      rejectCrossSiteMutation(
        request("POST", {
          origin: "https://jsquaredadventures.com",
          "sec-fetch-site": "same-origin",
        }),
      ),
    ).toBeNull();
  });

  it("allows the www and staging origins", () => {
    expect(
      rejectCrossSiteMutation(
        request("PATCH", { origin: "https://www.jsquaredadventures.com" }),
      ),
    ).toBeNull();
    expect(
      rejectCrossSiteMutation(
        request("DELETE", { origin: "https://next.jsquaredadventures.com" }),
      ),
    ).toBeNull();
  });

  it("rejects a cross-site Origin", () => {
    expect(
      rejectCrossSiteMutation(
        request("POST", { origin: "https://evil.example" }),
      )?.status,
    ).toBe(403);
  });

  it("rejects an explicit cross-site fetch even with an allowed Origin", () => {
    expect(
      rejectCrossSiteMutation(
        request("POST", {
          origin: "https://jsquaredadventures.com",
          "sec-fetch-site": "cross-site",
        }),
      )?.status,
    ).toBe(403);
  });

  it("allows localhost and 127.0.0.1 on any dev port", () => {
    for (const origin of [
      "http://localhost:3100",
      "http://127.0.0.1:3100",
      "http://[::1]:3100",
    ]) {
      expect(
        rejectCrossSiteMutation(request("POST", { origin }))?.status,
      ).toBeUndefined();
    }
  });

  it("rejects localhost in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    try {
      expect(
        rejectCrossSiteMutation(
          request("POST", { origin: "http://localhost:3100" }),
        )?.status,
      ).toBe(403);
    } finally {
      vi.unstubAllEnvs();
    }
  });

  it("rejects a missing Origin in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    try {
      expect(rejectCrossSiteMutation(request("POST"))?.status).toBe(403);
    } finally {
      vi.unstubAllEnvs();
    }
  });
});
