import type { User } from "@supabase/supabase-js";

import { afterEach, describe, expect, it, vi } from "vitest";
import { NextResponse } from "next/server";

vi.mock("@/lib/supabase/server", () => ({
  getRequestSupabaseUser: vi.fn(),
}));

vi.mock("@/server/auth/public-users", () => ({
  ensurePublicAppUser: vi.fn(),
}));

vi.mock("@/server/dal/comments", () => ({
  commentExists: vi.fn(),
  toggleCommentLikeRecord: vi.fn(),
}));

vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: vi.fn(),
  getClientIp: vi.fn(() => "127.0.0.1"),
  tooManyRequests: vi.fn(() => NextResponse.json({ error: "Too many requests" }, { status: 429 })),
}));

import { POST } from "@/app/api/comments/[commentId]/like/route";
import { checkRateLimit, tooManyRequests } from "@/lib/rate-limit";
import { getRequestSupabaseUser } from "@/lib/supabase/server";
import { ensurePublicAppUser } from "@/server/auth/public-users";
import { commentExists, toggleCommentLikeRecord } from "@/server/dal/comments";

function makeSupabaseUser(id = "supabase-user-1"): User {
  return {
    id,
    app_metadata: {},
    user_metadata: {},
    aud: "authenticated",
    created_at: "2026-01-01T00:00:00.000Z",
  };
}

describe("POST /api/comments/[commentId]/like", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns 400 for an invalid comment id", async () => {
    const response = await POST(new Request("http://localhost/api/comments/invalid id/like", { method: "POST" }), {
      params: Promise.resolve({ commentId: "invalid id" }),
    });

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "Invalid comment ID" });
  });

  it("returns 401 when the caller is unauthenticated", async () => {
    vi.mocked(checkRateLimit).mockResolvedValue({ allowed: true, limit: 30, remaining: 29, resetAt: Date.now() + 60_000 });
    vi.mocked(getRequestSupabaseUser).mockResolvedValue(null);

    const response = await POST(new Request("http://localhost/api/comments/comment-1/like", { method: "POST" }), {
      params: Promise.resolve({ commentId: "comment-1" }),
    });

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "Unauthorized" });
    expect(vi.mocked(commentExists)).not.toHaveBeenCalled();
  });

  it("rejects likes for non-visible comments", async () => {
    vi.mocked(checkRateLimit).mockResolvedValue({ allowed: true, limit: 30, remaining: 29, resetAt: Date.now() + 60_000 });
    vi.mocked(getRequestSupabaseUser).mockResolvedValue(makeSupabaseUser());
    vi.mocked(commentExists).mockResolvedValue(false);

    const response = await POST(new Request("http://localhost/api/comments/comment-1/like", { method: "POST" }), {
      params: Promise.resolve({ commentId: "comment-1" }),
    });

    expect(response.status).toBe(404);
    expect(vi.mocked(toggleCommentLikeRecord)).not.toHaveBeenCalled();
  });

  it("toggles likes for visible comments", async () => {
    vi.mocked(checkRateLimit).mockResolvedValue({ allowed: true, limit: 30, remaining: 29, resetAt: Date.now() + 60_000 });
    vi.mocked(getRequestSupabaseUser).mockResolvedValue(makeSupabaseUser());
    vi.mocked(commentExists).mockResolvedValue(true);
    vi.mocked(ensurePublicAppUser).mockResolvedValue({
      id: "public-user-1",
      supabaseUserId: "supabase-user-1",
      email: "reader@example.com",
      displayName: "Reader",
      avatarUrl: null,
    });
    vi.mocked(toggleCommentLikeRecord).mockResolvedValue({ liked: true });

    const response = await POST(new Request("http://localhost/api/comments/comment-1/like", { method: "POST" }), {
      params: Promise.resolve({ commentId: "comment-1" }),
    });

    expect(response.status).toBe(201);
    expect(vi.mocked(toggleCommentLikeRecord)).toHaveBeenCalledWith("comment-1", "public-user-1");
    expect(await response.json()).toEqual({ liked: true });
  });

  it("returns the rate limit response when throttled", async () => {
    const throttledResponse = NextResponse.json({ error: "Too many requests" }, { status: 429 });
    vi.mocked(checkRateLimit).mockResolvedValue({ allowed: false, limit: 30, remaining: 0, resetAt: Date.now() + 60_000 });
    vi.mocked(tooManyRequests).mockReturnValue(throttledResponse);

    const response = await POST(new Request("http://localhost/api/comments/comment-1/like", { method: "POST" }), {
      params: Promise.resolve({ commentId: "comment-1" }),
    });

    expect(response).toBe(throttledResponse);
    expect(vi.mocked(getRequestSupabaseUser)).not.toHaveBeenCalled();
  });
});
