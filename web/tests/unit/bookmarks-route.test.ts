import type { User } from "@supabase/supabase-js";

import { afterEach, describe, expect, it, vi } from "vitest";
import { NextResponse } from "next/server";

vi.mock("@/lib/cloudinary/transform", () => ({
  cdnImageUrl: vi.fn((value: string | null) => (value ? `https://cdn.example/${value}` : null)),
}));

vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: vi.fn(),
  getClientIp: vi.fn(() => "127.0.0.1"),
  tooManyRequests: vi.fn(() => NextResponse.json({ error: "Too many requests" }, { status: 429 })),
}));

vi.mock("@/lib/supabase/server", () => ({
  getRequestSupabaseUser: vi.fn(),
}));

vi.mock("@/server/auth/public-users", () => ({
  ensurePublicAppUser: vi.fn(),
}));

vi.mock("@/server/dal/bookmarks", () => ({
  listBookmarkedPosts: vi.fn(),
}));

import { GET } from "@/app/api/bookmarks/route";
import { cdnImageUrl } from "@/lib/cloudinary/transform";
import { checkRateLimit, tooManyRequests } from "@/lib/rate-limit";
import { getRequestSupabaseUser } from "@/lib/supabase/server";
import { ensurePublicAppUser } from "@/server/auth/public-users";
import { listBookmarkedPosts } from "@/server/dal/bookmarks";

function makeSupabaseUser(id = "supabase-user-1"): User {
  return {
    id,
    app_metadata: {},
    user_metadata: {},
    aud: "authenticated",
    created_at: "2026-01-01T00:00:00.000Z",
  };
}

describe("GET /api/bookmarks", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when unauthenticated", async () => {
    vi.mocked(getRequestSupabaseUser).mockResolvedValue(null);

    const response = await GET(new Request("http://localhost/api/bookmarks"));

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "Unauthorized" });
    expect(vi.mocked(checkRateLimit)).not.toHaveBeenCalled();
  });

  it("returns the throttled response when rate limited", async () => {
    vi.mocked(getRequestSupabaseUser).mockResolvedValue(makeSupabaseUser());
    vi.mocked(checkRateLimit).mockResolvedValue({
      allowed: false,
      limit: 60,
      remaining: 0,
      resetAt: Date.now() + 60_000,
    });
    const throttled = NextResponse.json({ error: "Too many requests" }, { status: 429 });
    vi.mocked(tooManyRequests).mockReturnValue(throttled);

    const response = await GET(new Request("http://localhost/api/bookmarks"));

    expect(response).toBe(throttled);
    expect(vi.mocked(ensurePublicAppUser)).not.toHaveBeenCalled();
    expect(vi.mocked(listBookmarkedPosts)).not.toHaveBeenCalled();
  });

  it("returns transformed bookmarked posts for authenticated users", async () => {
    vi.mocked(getRequestSupabaseUser).mockResolvedValue(makeSupabaseUser());
    vi.mocked(checkRateLimit).mockResolvedValue({
      allowed: true,
      limit: 60,
      remaining: 59,
      resetAt: Date.now() + 60_000,
    });
    vi.mocked(ensurePublicAppUser).mockResolvedValue({
      id: "public-user-1",
      supabaseUserId: "supabase-user-1",
      email: "reader@example.com",
      displayName: "Reader",
      avatarUrl: null,
    });
    vi.mocked(listBookmarkedPosts).mockResolvedValue([
      {
        id: "post-1",
        slug: "patagonia-notes",
        title: "Patagonia Notes",
        excerpt: "A Patagonia field note",
        imageUrl: "uploads/patagonia.jpg",
        category: null,
        publishedAt: new Date("2026-03-19T12:00:00.000Z"),
        bookmarkedAt: new Date("2026-03-20T12:00:00.000Z"),
      },
      {
        id: "post-2",
        slug: "andes-notes",
        title: "Andes Notes",
        excerpt: null,
        imageUrl: null,
        category: null,
        publishedAt: null,
        bookmarkedAt: new Date("2026-03-21T12:00:00.000Z"),
      },
    ]);

    const response = await GET(new Request("http://localhost/api/bookmarks"));

    expect(response.status).toBe(200);
    expect(vi.mocked(checkRateLimit)).toHaveBeenCalledWith("bookmarks-list:supabase-user-1:127.0.0.1", 60, 60_000);
    expect(vi.mocked(listBookmarkedPosts)).toHaveBeenCalledWith("public-user-1");
    expect(vi.mocked(cdnImageUrl)).toHaveBeenCalledTimes(2);
    expect(await response.json()).toEqual({
      posts: [
        {
          id: "post-1",
          slug: "patagonia-notes",
          title: "Patagonia Notes",
          excerpt: "A Patagonia field note",
          imageUrl: "https://cdn.example/uploads/patagonia.jpg",
          category: null,
          publishedAt: "2026-03-19T12:00:00.000Z",
          bookmarkedAt: "2026-03-20T12:00:00.000Z",
        },
        {
          id: "post-2",
          slug: "andes-notes",
          title: "Andes Notes",
          excerpt: null,
          imageUrl: null,
          category: null,
          publishedAt: null,
          bookmarkedAt: "2026-03-21T12:00:00.000Z",
        },
      ],
    });
  });

  it("returns a safe generic error when ensuring the public app user fails", async () => {
    vi.mocked(getRequestSupabaseUser).mockResolvedValue(makeSupabaseUser());
    vi.mocked(checkRateLimit).mockResolvedValue({
      allowed: true,
      limit: 60,
      remaining: 59,
      resetAt: Date.now() + 60_000,
    });
    vi.mocked(ensurePublicAppUser).mockRejectedValue(new Error("profile repair failed"));

    const response = await GET(new Request("http://localhost/api/bookmarks"));

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: "Failed to load bookmarks" });
    expect(vi.mocked(listBookmarkedPosts)).not.toHaveBeenCalled();
  });

  it("returns a safe generic error when listing bookmarks fails unexpectedly", async () => {
    vi.mocked(getRequestSupabaseUser).mockResolvedValue(makeSupabaseUser());
    vi.mocked(checkRateLimit).mockResolvedValue({
      allowed: true,
      limit: 60,
      remaining: 59,
      resetAt: Date.now() + 60_000,
    });
    vi.mocked(ensurePublicAppUser).mockResolvedValue({
      id: "public-user-1",
      supabaseUserId: "supabase-user-1",
      email: "reader@example.com",
      displayName: "Reader",
      avatarUrl: null,
    });
    vi.mocked(listBookmarkedPosts).mockRejectedValue(new Error("database offline"));

    const response = await GET(new Request("http://localhost/api/bookmarks"));

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: "Failed to load bookmarks" });
  });
});
