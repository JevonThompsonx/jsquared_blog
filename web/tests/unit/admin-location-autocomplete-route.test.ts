import { afterEach, describe, expect, it, vi } from "vitest";
import { NextResponse } from "next/server";

vi.mock("@/lib/auth/session", () => ({
  requireAdminSession: vi.fn(),
}));

vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: vi.fn(),
  getClientIp: vi.fn(() => "127.0.0.1"),
  tooManyRequests: vi.fn(() => NextResponse.json({ error: "Too many requests" }, { status: 429 })),
}));

import { GET } from "@/app/api/admin/location-autocomplete/route";
import { requireAdminSession } from "@/lib/auth/session";
import { checkRateLimit, tooManyRequests } from "@/lib/rate-limit";

describe("GET /api/admin/location-autocomplete", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  it("rejects unauthenticated callers", async () => {
    vi.mocked(requireAdminSession).mockResolvedValue(null);

    const response = await GET(new Request("http://localhost/api/admin/location-autocomplete?q=banff"));

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "Unauthorized" });
  });

  it("returns the throttled response when rate limited", async () => {
    vi.mocked(requireAdminSession).mockResolvedValue({ user: { id: "admin-1", role: "admin" } } as never);
    vi.mocked(checkRateLimit).mockResolvedValue({
      allowed: false,
      limit: 10,
      remaining: 0,
      resetAt: Date.now() + 60_000,
    });
    const throttled = NextResponse.json({ error: "Too many requests" }, { status: 429 });
    vi.mocked(tooManyRequests).mockReturnValue(throttled);

    const response = await GET(new Request("http://localhost/api/admin/location-autocomplete?q=banff"));

    expect(response).toBe(throttled);
  });

  it("rejects invalid autocomplete queries", async () => {
    vi.mocked(requireAdminSession).mockResolvedValue({ user: { id: "admin-1", role: "admin" } } as never);
    vi.mocked(checkRateLimit).mockResolvedValue({
      allowed: true,
      limit: 10,
      remaining: 9,
      resetAt: Date.now() + 60_000,
    });

    const response = await GET(new Request("http://localhost/api/admin/location-autocomplete?q= "));

    expect(response.status).toBe(422);
    expect(await response.json()).toEqual({ error: "Invalid autocomplete request" });
  });

  it("returns normalized location suggestions", async () => {
    vi.mocked(requireAdminSession).mockResolvedValue({ user: { id: "admin-1", role: "admin" } } as never);
    vi.mocked(checkRateLimit).mockResolvedValue({
      allowed: true,
      limit: 10,
      remaining: 9,
      resetAt: Date.now() + 60_000,
    });
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => [
        {
          place_id: 12345,
          display_name: "Banff, Improvement District No. 9, Alberta, Canada",
          lat: "51.1784",
          lon: "-115.5708",
          type: "town",
        },
      ],
    } as Response);

    const response = await GET(new Request("http://localhost/api/admin/location-autocomplete?q=banff"));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      suggestions: [
        {
          provider: "nominatim",
          placeId: "12345",
          locationName: "Banff, Improvement District No. 9, Alberta",
          latitude: 51.1784,
          longitude: -115.5708,
          zoom: 10,
          kind: "town",
        },
      ],
    });
  });

  it("returns a generic upstream failure response", async () => {
    vi.mocked(requireAdminSession).mockResolvedValue({ user: { id: "admin-1", role: "admin" } } as never);
    vi.mocked(checkRateLimit).mockResolvedValue({
      allowed: true,
      limit: 10,
      remaining: 9,
      resetAt: Date.now() + 60_000,
    });
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("socket hang up"));

    const response = await GET(new Request("http://localhost/api/admin/location-autocomplete?q=banff"));

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: "Location suggestions unavailable" });
  });
});
