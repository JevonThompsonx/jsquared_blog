import { describe, expect, it } from "vitest";

import { getClientIp } from "@/lib/rate-limit";

function requestWith(headers: Record<string, string>): Request {
  return new Request("https://jsquaredadventures.com/api/posts", { headers });
}

describe("getClientIp", () => {
  it("prefers Cloudflare's cf-connecting-ip over a spoofed X-Forwarded-For", () => {
    const request = requestWith({
      "cf-connecting-ip": "9.9.9.9",
      "x-forwarded-for": "1.1.1.1, 9.9.9.9",
    });

    const first = getClientIp(request);
    const second = getClientIp(request);

    expect(first).toBe(second);
    expect(first).not.toContain("9.9.9.9");
    expect(first).toHaveLength(32);
  });

  it("uses the last X-Forwarded-For hop when Cloudflare headers are absent", () => {
    const spoofed = requestWith({
      "x-forwarded-for": "1.1.1.1, 203.0.113.7",
    });
    const real = requestWith({
      "x-forwarded-for": "203.0.113.7",
    });

    expect(getClientIp(spoofed)).toBe(getClientIp(real));
  });

  it("returns a pseudonymous key rather than a raw address", () => {
    const key = getClientIp(requestWith({ "cf-connecting-ip": "203.0.113.7" }));

    expect(key).toMatch(/^[a-f0-9]{32}$/);
  });

  it("falls back to unknown when no trusted header exists", () => {
    expect(getClientIp(requestWith({}))).toBe("unknown");
  });
});
