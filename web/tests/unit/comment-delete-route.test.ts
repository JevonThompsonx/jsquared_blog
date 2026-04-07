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
  deleteCommentRecord: vi.fn(),
}));

vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: vi.fn(),
  getClientIp: vi.fn(() => "127.0.0.1"),
  tooManyRequests: vi.fn(() => NextResponse.json({ error: "Too many requests" }, { status: 429 })),
}));

import { DELETE } from "@/app/api/comments/[commentId]/route";
import { checkRateLimit, tooManyRequests } from "@/lib/rate-limit";
import { getRequestSupabaseUser } from "@/lib/supabase/server";
import { ensurePublicAppUser } from "@/server/auth/public-users";
import { deleteCommentRecord } from "@/server/dal/comments";

function makeSupabaseUser(id = "supabase-user-1"): User {
  return {
    id,
    app_metadata: {},
    user_metadata: {},
    aud: "authenticated",
    created_at: "2026-01-01T00:00:00.000Z",
  };
}

describe("DELETE /api/comments/[commentId]", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns 400 for an invalid comment id", async () => {
    const response = await DELETE(new Request("http://localhost/api/comments/invalid id", { method: "DELETE" }), {
      params: Promise.resolve({ commentId: "invalid id" }),
    });

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "Invalid comment ID" });
  });

  it("returns 401 when the caller is unauthenticated", async () => {
    vi.mocked(getRequestSupabaseUser).mockResolvedValue(null);

    const response = await DELETE(new Request("http://localhost/api/comments/comment-1", { method: "DELETE" }), {
      params: Promise.resolve({ commentId: "comment-1" }),
    });

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "Unauthorized" });
    expect(vi.mocked(checkRateLimit)).not.toHaveBeenCalled();
  });

  it("returns the throttled response when rate limited", async () => {
    vi.mocked(getRequestSupabaseUser).mockResolvedValue(makeSupabaseUser());
    vi.mocked(checkRateLimit).mockResolvedValue({ allowed: false, limit: 20, remaining: 0, resetAt: Date.now() + 60_000 });
    const throttledResponse = NextResponse.json({ error: "Too many requests" }, { status: 429 });
    vi.mocked(tooManyRequests).mockReturnValue(throttledResponse);

    const response = await DELETE(new Request("http://localhost/api/comments/comment-1", { method: "DELETE" }), {
      params: Promise.resolve({ commentId: "comment-1" }),
    });

    expect(response).toBe(throttledResponse);
    expect(vi.mocked(ensurePublicAppUser)).not.toHaveBeenCalled();
  });

  it("returns 404 when the comment cannot be deleted", async () => {
    vi.mocked(getRequestSupabaseUser).mockResolvedValue(makeSupabaseUser());
    vi.mocked(checkRateLimit).mockResolvedValue({ allowed: true, limit: 20, remaining: 19, resetAt: Date.now() + 60_000 });
    vi.mocked(ensurePublicAppUser).mockResolvedValue({
      id: "public-user-1",
      supabaseUserId: "supabase-user-1",
      email: "reader@example.com",
      displayName: "Reader",
      avatarUrl: null,
    });
    vi.mocked(deleteCommentRecord).mockResolvedValue(false);

    const response = await DELETE(new Request("http://localhost/api/comments/comment-1", { method: "DELETE" }), {
      params: Promise.resolve({ commentId: "comment-1" }),
    });

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: "Comment not found" });
  });

  it("returns success when the caller deletes their own comment", async () => {
    vi.mocked(getRequestSupabaseUser).mockResolvedValue(makeSupabaseUser());
    vi.mocked(checkRateLimit).mockResolvedValue({ allowed: true, limit: 20, remaining: 19, resetAt: Date.now() + 60_000 });
    vi.mocked(ensurePublicAppUser).mockResolvedValue({
      id: "public-user-1",
      supabaseUserId: "supabase-user-1",
      email: "reader@example.com",
      displayName: "Reader",
      avatarUrl: null,
    });
    vi.mocked(deleteCommentRecord).mockResolvedValue(true);

    const response = await DELETE(new Request("http://localhost/api/comments/comment-1", { method: "DELETE" }), {
      params: Promise.resolve({ commentId: "comment-1" }),
    });

    expect(response.status).toBe(200);
    expect(vi.mocked(deleteCommentRecord)).toHaveBeenCalledWith("comment-1", "public-user-1");
    expect(await response.json()).toEqual({ ok: true });
  });
});
