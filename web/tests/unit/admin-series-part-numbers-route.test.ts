import { NextResponse } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: vi.fn(),
  getClientIp: vi.fn(() => "127.0.0.1"),
  tooManyRequests: vi.fn(() => NextResponse.json({ error: "Too many requests" }, { status: 429 })),
}));

vi.mock("@/lib/auth/session", () => ({
  requireAdminSession: vi.fn(),
}));

vi.mock("@/server/dal/series", () => ({
  getSeriesPartNumbers: vi.fn(),
}));

import { GET } from "@/app/api/admin/series/[seriesId]/part-numbers/route";
import { requireAdminSession } from "@/lib/auth/session";
import { checkRateLimit, tooManyRequests } from "@/lib/rate-limit";
import { getSeriesPartNumbers } from "@/server/dal/series";

const MOCK_ADMIN_SESSION = {
  user: { id: "admin-1", email: "admin@example.com", name: "Admin" },
  expires: new Date(Date.now() + 1000 * 60 * 60).toISOString(),
};

describe("GET /api/admin/series/[seriesId]/part-numbers", () => {
  beforeEach(() => {
    vi.mocked(checkRateLimit).mockResolvedValue({
      allowed: true,
      limit: 120,
      remaining: 119,
      resetAt: Date.now() + 60_000,
    });
    vi.mocked(tooManyRequests).mockImplementation(() => NextResponse.json({ error: "Too many requests" }, { status: 429 }));
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(requireAdminSession).mockResolvedValue(null);

    const response = await GET(new Request("http://localhost/api/admin/series/series-1/part-numbers"), {
      params: Promise.resolve({ seriesId: "series-1" }),
    });

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "Unauthorized" });
  });

  it("returns the throttled response when rate limited", async () => {
    vi.mocked(requireAdminSession).mockResolvedValue(MOCK_ADMIN_SESSION);
    vi.mocked(checkRateLimit).mockResolvedValue({ allowed: false, limit: 120, remaining: 0, resetAt: Date.now() + 60_000 });
    const throttled = NextResponse.json({ error: "Too many requests" }, { status: 429 });
    vi.mocked(tooManyRequests).mockReturnValue(throttled);

    const response = await GET(new Request("http://localhost/api/admin/series/series-1/part-numbers"), {
      params: Promise.resolve({ seriesId: "series-1" }),
    });

    expect(response).toBe(throttled);
    expect(vi.mocked(getSeriesPartNumbers)).not.toHaveBeenCalled();
  });

  it("returns 400 for whitespace-only series ids", async () => {
    vi.mocked(requireAdminSession).mockResolvedValue(MOCK_ADMIN_SESSION);

    const response = await GET(new Request("http://localhost/api/admin/series/%20%20%20/part-numbers"), {
      params: Promise.resolve({ seriesId: "   " }),
    });

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "Invalid series id" });
  });

  it("returns 500 for unexpected lookup failures", async () => {
    vi.mocked(requireAdminSession).mockResolvedValue(MOCK_ADMIN_SESSION);
    vi.mocked(getSeriesPartNumbers).mockRejectedValue(new Error("database offline"));

    const response = await GET(new Request("http://localhost/api/admin/series/series-1/part-numbers"), {
      params: Promise.resolve({ seriesId: "series-1" }),
    });

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: "Failed to load series part numbers" });
  });

  it("returns part numbers for valid requests", async () => {
    vi.mocked(requireAdminSession).mockResolvedValue(MOCK_ADMIN_SESSION);
    vi.mocked(getSeriesPartNumbers).mockResolvedValue({ takenNumbers: [1, 2, 4], next: 5 });

    const response = await GET(new Request("http://localhost/api/admin/series/series-1/part-numbers"), {
      params: Promise.resolve({ seriesId: "series-1" }),
    });

    expect(response.status).toBe(200);
    expect(vi.mocked(getSeriesPartNumbers)).toHaveBeenCalledWith("series-1");
    expect(await response.json()).toEqual({ takenNumbers: [1, 2, 4], next: 5 });
  });
});
