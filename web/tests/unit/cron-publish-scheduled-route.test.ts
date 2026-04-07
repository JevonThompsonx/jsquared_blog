import { afterEach, describe, expect, it, vi } from "vitest";
import { NextResponse } from "next/server";

vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: vi.fn(() => Promise.resolve({ allowed: true, limit: 30, remaining: 29, resetAt: Date.now() + 60_000 })),
  getClientIp: vi.fn(() => "127.0.0.1"),
  tooManyRequests: vi.fn(() => NextResponse.json({ error: "Too many requests" }, { status: 429 })),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/server/posts/publish", () => ({
  publishDueScheduledPosts: vi.fn(),
}));

import { GET } from "@/app/api/cron/publish-scheduled/route";
import { checkRateLimit, tooManyRequests } from "@/lib/rate-limit";
import { revalidatePath } from "next/cache";
import { publishDueScheduledPosts } from "@/server/posts/publish";

describe("GET /api/cron/publish-scheduled", () => {
  afterEach(() => {
    vi.resetAllMocks();
    vi.unstubAllEnvs();
  });

  it("returns throttled response when rate limited", async () => {
    vi.mocked(checkRateLimit).mockResolvedValue({ allowed: false, limit: 30, remaining: 0, resetAt: Date.now() + 60_000 });
    const throttled = NextResponse.json({ error: "Too many requests" }, { status: 429 });
    vi.mocked(tooManyRequests).mockReturnValue(throttled);

    const response = await GET(new Request("http://localhost/api/cron/publish-scheduled"));

    expect(response).toBe(throttled);
    expect(vi.mocked(publishDueScheduledPosts)).not.toHaveBeenCalled();
  });

  it("returns 401 when cron secret is configured but token is invalid", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("CRON_SECRET", "very-secret-token");

    const response = await GET(
      new Request("http://localhost/api/cron/publish-scheduled", {
        headers: { authorization: "Bearer wrong-token" },
      }),
    );

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "Unauthorized" });
    expect(vi.mocked(publishDueScheduledPosts)).not.toHaveBeenCalled();
  });

  it("allows local development runs when CRON_SECRET is not set", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("CRON_SECRET", "");

    vi.mocked(publishDueScheduledPosts).mockResolvedValue({
      scannedCount: 5,
      publishedCount: 2,
      updatedPostIds: ["post-1", "post-2"],
      nowIso: "2026-03-29T21:00:00.000Z",
    });

    const response = await GET(new Request("http://localhost/api/cron/publish-scheduled"));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      scanned: 5,
      published: 2,
      ids: ["post-1", "post-2"],
      nowIso: "2026-03-29T21:00:00.000Z",
      timezone: "UTC",
    });
    expect(vi.mocked(revalidatePath)).toHaveBeenCalledWith("/");
    expect(vi.mocked(revalidatePath)).toHaveBeenCalledWith("/admin");
  });

  it("publishes successfully when bearer token matches secret", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("CRON_SECRET", "very-secret-token");

    vi.mocked(publishDueScheduledPosts).mockResolvedValue({
      scannedCount: 3,
      publishedCount: 1,
      updatedPostIds: ["post-9"],
      nowIso: "2026-03-29T22:00:00.000Z",
    });

    const response = await GET(
      new Request("http://localhost/api/cron/publish-scheduled", {
        headers: { authorization: "Bearer very-secret-token" },
      }),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      scanned: 3,
      published: 1,
      ids: ["post-9"],
      nowIso: "2026-03-29T22:00:00.000Z",
      timezone: "UTC",
    });
  });
});
