import { afterEach, describe, expect, it, vi } from "vitest";
import { NextResponse } from "next/server";

vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: vi.fn(),
  getClientIp: vi.fn(() => "127.0.0.1"),
  tooManyRequests: vi.fn(() => NextResponse.json({ error: "Too many requests" }, { status: 429 })),
}));

vi.mock("@/server/queries/posts", () => ({
  listPublishedPosts: vi.fn(),
  listPublishedPostsByCategory: vi.fn(),
  listPublishedPostsByTagSlug: vi.fn(),
}));

import { GET } from "@/app/api/posts/route";
import { checkRateLimit, tooManyRequests } from "@/lib/rate-limit";
import { listPublishedPosts, listPublishedPostsByCategory, listPublishedPostsByTagSlug } from "@/server/queries/posts";
import type { BlogPost } from "@/types/blog";

const samplePost: BlogPost = {
  id: "post-1",
  slug: "patagonia-notes",
  title: "Patagonia Notes",
  description: null,
  excerpt: null,
  imageUrl: null,
  category: null,
  createdAt: "2026-01-01T00:00:00.000Z",
  status: "published",
  tags: [],
  images: [],
  source: "turso",
  locationName: null,
  locationLat: null,
  locationLng: null,
  locationZoom: null,
  iovanderUrl: null,
  commentCount: 0,
};

describe("GET /api/posts", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns the throttled response when rate limited", async () => {
    vi.mocked(checkRateLimit).mockResolvedValue({
      allowed: false,
      limit: 60,
      remaining: 0,
      resetAt: Date.now() + 60_000,
    });
    const throttled = NextResponse.json({ error: "Too many requests" }, { status: 429 });
    vi.mocked(tooManyRequests).mockReturnValue(throttled);

    const response = await GET(new Request("http://localhost/api/posts"));

    expect(response).toBe(throttled);
    expect(vi.mocked(listPublishedPosts)).not.toHaveBeenCalled();
  });

  it("returns a generic 400 for invalid query parameters", async () => {
    vi.mocked(checkRateLimit).mockResolvedValue({
      allowed: true,
      limit: 60,
      remaining: 59,
      resetAt: Date.now() + 60_000,
    });

    const response = await GET(new Request("http://localhost/api/posts?limit=0"));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "Invalid query parameters" });
    expect(vi.mocked(listPublishedPosts)).not.toHaveBeenCalled();
    expect(vi.mocked(listPublishedPostsByCategory)).not.toHaveBeenCalled();
    expect(vi.mocked(listPublishedPostsByTagSlug)).not.toHaveBeenCalled();
  });

  it("returns list results for valid search params", async () => {
    vi.mocked(checkRateLimit).mockResolvedValue({
      allowed: true,
      limit: 60,
      remaining: 59,
      resetAt: Date.now() + 60_000,
    });
    vi.mocked(listPublishedPosts).mockResolvedValue([samplePost]);

    const response = await GET(new Request("http://localhost/api/posts?limit=1&offset=0&search=patagonia"));

    expect(response.status).toBe(200);
    expect(vi.mocked(listPublishedPosts)).toHaveBeenCalledWith(1, 0, "patagonia");
    expect(await response.json()).toEqual({
      posts: [samplePost],
      limit: 1,
      offset: 0,
      hasMore: true,
    });
  });
});
