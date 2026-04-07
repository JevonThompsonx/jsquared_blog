import type { User } from "@supabase/supabase-js";

import { afterEach, describe, expect, it, vi } from "vitest";
import { NextResponse } from "next/server";

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
  isPostBookmarked: vi.fn(),
  togglePostBookmark: vi.fn(),
}));

import { GET } from "@/app/api/posts/[postId]/bookmark/route";
import { checkRateLimit, tooManyRequests } from "@/lib/rate-limit";
import { getRequestSupabaseUser } from "@/lib/supabase/server";
import { ensurePublicAppUser } from "@/server/auth/public-users";
import { isPostBookmarked } from "@/server/dal/bookmarks";

function makeSupabaseUser(id = "supabase-user-1"): User {
  return {
    id,
    app_metadata: {},
    user_metadata: {},
    aud: "authenticated",
    created_at: "2026-01-01T00:00:00.000Z",
  };
}

describe("GET /api/posts/[postId]/bookmark", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns 400 for invalid post id", async () => {
    const response = await GET(new Request("http://localhost/api/posts/invalid id/bookmark"), {
      params: Promise.resolve({ postId: "invalid id" }),
    });

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "Invalid post ID" });
  });

  it("returns bookmarked false when unauthenticated", async () => {
    vi.mocked(getRequestSupabaseUser).mockResolvedValue(null);

    const response = await GET(new Request("http://localhost/api/posts/post-1/bookmark"), {
      params: Promise.resolve({ postId: "post-1" }),
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ bookmarked: false });
    expect(vi.mocked(checkRateLimit)).not.toHaveBeenCalled();
  });

  it("returns throttled response for authenticated users when rate limited", async () => {
    vi.mocked(getRequestSupabaseUser).mockResolvedValue(makeSupabaseUser());
    vi.mocked(checkRateLimit).mockResolvedValue({
      allowed: false,
      limit: 60,
      remaining: 0,
      resetAt: Date.now() + 60_000,
    });
    const throttled = NextResponse.json({ error: "Too many requests" }, { status: 429 });
    vi.mocked(tooManyRequests).mockReturnValue(throttled);

    const response = await GET(new Request("http://localhost/api/posts/post-1/bookmark"), {
      params: Promise.resolve({ postId: "post-1" }),
    });

    expect(response).toBe(throttled);
    expect(vi.mocked(ensurePublicAppUser)).not.toHaveBeenCalled();
    expect(vi.mocked(isPostBookmarked)).not.toHaveBeenCalled();
  });

  it("returns bookmark status for authenticated users", async () => {
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
    vi.mocked(isPostBookmarked).mockResolvedValue(true);

    const response = await GET(new Request("http://localhost/api/posts/post-1/bookmark"), {
      params: Promise.resolve({ postId: "post-1" }),
    });

    expect(response.status).toBe(200);
    expect(vi.mocked(checkRateLimit)).toHaveBeenCalledWith("bookmark-status:supabase-user-1:127.0.0.1", 60, 60_000);
    expect(await response.json()).toEqual({ bookmarked: true });
  });
});
