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
  getPublicAppUserBySupabaseId: vi.fn(),
}));

vi.mock("@/server/dal/comments", () => ({
  canCommentOnPost: vi.fn(),
  canReplyToComment: vi.fn(),
  createCommentRecord: vi.fn(),
  listCommentsForPost: vi.fn(),
}));

vi.mock("@/server/services/comment-notifications", () => ({
  sendCommentNotification: vi.fn(),
}));

import { GET } from "@/app/api/posts/[postId]/comments/route";
import { checkRateLimit, tooManyRequests } from "@/lib/rate-limit";
import { getRequestSupabaseUser } from "@/lib/supabase/server";
import { getPublicAppUserBySupabaseId } from "@/server/auth/public-users";
import { canCommentOnPost, listCommentsForPost } from "@/server/dal/comments";

describe("GET /api/posts/[postId]/comments", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns 400 for invalid post id", async () => {
    const response = await GET(new Request("http://localhost/api/posts/invalid/comments"), {
      params: Promise.resolve({ postId: "" }),
    });

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "Invalid post id" });
  });

  it("returns the throttled response when rate limited", async () => {
    vi.mocked(checkRateLimit).mockResolvedValue({
      allowed: false,
      limit: 120,
      remaining: 0,
      resetAt: Date.now() + 60_000,
    });
    const throttled = NextResponse.json({ error: "Too many requests" }, { status: 429 });
    vi.mocked(tooManyRequests).mockReturnValue(throttled);

    const response = await GET(new Request("http://localhost/api/posts/post-1/comments"), {
      params: Promise.resolve({ postId: "post-1" }),
    });

    expect(response).toBe(throttled);
    expect(vi.mocked(listCommentsForPost)).not.toHaveBeenCalled();
  });

  it("returns 404 when the post is not publicly commentable", async () => {
    vi.mocked(checkRateLimit).mockResolvedValue({
      allowed: true,
      limit: 120,
      remaining: 119,
      resetAt: Date.now() + 60_000,
    });
    vi.mocked(canCommentOnPost).mockResolvedValue(false);

    const response = await GET(new Request("http://localhost/api/posts/post-1/comments?sort=newest"), {
      params: Promise.resolve({ postId: "post-1" }),
    });

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: "Post not found" });
    expect(vi.mocked(listCommentsForPost)).not.toHaveBeenCalled();
  });

  it("lists comments for anonymous viewers", async () => {
    vi.mocked(checkRateLimit).mockResolvedValue({
      allowed: true,
      limit: 120,
      remaining: 119,
      resetAt: Date.now() + 60_000,
    });
    vi.mocked(canCommentOnPost).mockResolvedValue(true);
    vi.mocked(getRequestSupabaseUser).mockResolvedValue(null);
    vi.mocked(listCommentsForPost).mockResolvedValue([]);

    const response = await GET(new Request("http://localhost/api/posts/post-1/comments?sort=newest"), {
      params: Promise.resolve({ postId: "post-1" }),
    });

    expect(response.status).toBe(200);
    expect(vi.mocked(getPublicAppUserBySupabaseId)).not.toHaveBeenCalled();
    expect(vi.mocked(listCommentsForPost)).toHaveBeenCalledWith("post-1", null, "newest");
    expect(await response.json()).toEqual({ comments: [] });
  });

  it("returns 400 for an invalid sort option", async () => {
    vi.mocked(checkRateLimit).mockResolvedValue({
      allowed: true,
      limit: 120,
      remaining: 119,
      resetAt: Date.now() + 60_000,
    });
    vi.mocked(canCommentOnPost).mockResolvedValue(true);

    const response = await GET(new Request("http://localhost/api/posts/post-1/comments?sort=popular"), {
      params: Promise.resolve({ postId: "post-1" }),
    });

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "Invalid sort option" });
  });

  it("passes the authenticated viewer id to the DAL when available", async () => {
    vi.mocked(checkRateLimit).mockResolvedValue({
      allowed: true,
      limit: 120,
      remaining: 119,
      resetAt: Date.now() + 60_000,
    });
    vi.mocked(canCommentOnPost).mockResolvedValue(true);
    vi.mocked(getRequestSupabaseUser).mockResolvedValue({ id: "supabase-user-1" } as Awaited<ReturnType<typeof getRequestSupabaseUser>>);
    vi.mocked(getPublicAppUserBySupabaseId).mockResolvedValue({
      id: "public-user-1",
      supabaseUserId: "supabase-user-1",
      email: "reader@example.com",
      displayName: "Reader",
      avatarUrl: null,
    });
    vi.mocked(listCommentsForPost).mockResolvedValue([]);

    const response = await GET(new Request("http://localhost/api/posts/post-1/comments?sort=likes"), {
      params: Promise.resolve({ postId: "post-1" }),
    });

    expect(response.status).toBe(200);
    expect(vi.mocked(getPublicAppUserBySupabaseId)).toHaveBeenCalledWith("supabase-user-1");
    expect(vi.mocked(listCommentsForPost)).toHaveBeenCalledWith("post-1", "public-user-1", "likes");
  });

  it("returns 500 when public-user lookup fails unexpectedly", async () => {
    vi.mocked(checkRateLimit).mockResolvedValue({
      allowed: true,
      limit: 120,
      remaining: 119,
      resetAt: Date.now() + 60_000,
    });
    vi.mocked(canCommentOnPost).mockResolvedValue(true);
    vi.mocked(getRequestSupabaseUser).mockResolvedValue({ id: "supabase-user-1" } as Awaited<ReturnType<typeof getRequestSupabaseUser>>);
    vi.mocked(getPublicAppUserBySupabaseId).mockRejectedValue(new Error("lookup failed"));

    const response = await GET(new Request("http://localhost/api/posts/post-1/comments?sort=likes"), {
      params: Promise.resolve({ postId: "post-1" }),
    });

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: "Failed to load comments" });
  });

  it("returns 500 when comment listing fails unexpectedly", async () => {
    vi.mocked(checkRateLimit).mockResolvedValue({
      allowed: true,
      limit: 120,
      remaining: 119,
      resetAt: Date.now() + 60_000,
    });
    vi.mocked(canCommentOnPost).mockResolvedValue(true);
    vi.mocked(getRequestSupabaseUser).mockResolvedValue(null);
    vi.mocked(listCommentsForPost).mockRejectedValue(new Error("query failed"));

    const response = await GET(new Request("http://localhost/api/posts/post-1/comments?sort=likes"), {
      params: Promise.resolve({ postId: "post-1" }),
    });

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: "Failed to load comments" });
  });

  it("returns 500 when post visibility lookup fails unexpectedly", async () => {
    vi.mocked(checkRateLimit).mockResolvedValue({
      allowed: true,
      limit: 120,
      remaining: 119,
      resetAt: Date.now() + 60_000,
    });
    vi.mocked(canCommentOnPost).mockRejectedValue(new Error("post lookup failed"));

    const response = await GET(new Request("http://localhost/api/posts/post-1/comments?sort=likes"), {
      params: Promise.resolve({ postId: "post-1" }),
    });

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: "Failed to load comments" });
  });
});
