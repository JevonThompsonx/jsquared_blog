import { afterEach, describe, expect, it, vi } from "vitest";
import { NextResponse } from "next/server";

vi.mock("@/server/auth/public-users", () => ({
  getRequestPublicUser: vi.fn(),
}));

vi.mock("@/server/dal/comments", () => ({
  commentExists: vi.fn(),
  toggleCommentLikeRecord: vi.fn(),
}));

vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: vi.fn(),
  getClientIp: vi.fn(() => "127.0.0.1"),
  tooManyRequests: vi.fn(() =>
    NextResponse.json({ error: "Too many requests" }, { status: 429 }),
  ),
}));

vi.mock("@/lib/sentry", () => ({
  captureException: vi.fn(),
}));

import { POST } from "@/app/api/comments/[commentId]/like/route";
import { getRequestPublicUser } from "@/server/auth/public-users";
import { checkRateLimit, tooManyRequests } from "@/lib/rate-limit";
import { captureException } from "@/lib/sentry";
import { commentExists, toggleCommentLikeRecord } from "@/server/dal/comments";

function makePublicUser(id = "reader-1") {
  return {
    id,
    email: "reader@example.com",
    displayName: "Reader",
    avatarUrl: null,
  };
}

describe("POST /api/comments/[commentId]/like", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns 400 for an invalid comment id", async () => {
    const response = await POST(
      new Request("http://localhost/api/comments/invalid id/like", {
        method: "POST",
      }),
      {
        params: Promise.resolve({ commentId: "invalid id" }),
      },
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "Invalid comment ID" });
  });

  it("returns 401 when the caller is unauthenticated", async () => {
    vi.mocked(getRequestPublicUser).mockResolvedValue(null);

    const response = await POST(
      new Request("http://localhost/api/comments/comment-1/like", {
        method: "POST",
      }),
      {
        params: Promise.resolve({ commentId: "comment-1" }),
      },
    );

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "Unauthorized" });
    expect(vi.mocked(checkRateLimit)).not.toHaveBeenCalled();
    expect(vi.mocked(commentExists)).not.toHaveBeenCalled();
  });

  it("rejects likes for non-visible comments", async () => {
    vi.mocked(checkRateLimit).mockResolvedValue({
      allowed: true,
      limit: 30,
      remaining: 29,
      resetAt: Date.now() + 60_000,
    });
    vi.mocked(getRequestPublicUser).mockResolvedValue(makePublicUser());
    vi.mocked(commentExists).mockResolvedValue(false);

    const response = await POST(
      new Request("http://localhost/api/comments/comment-1/like", {
        method: "POST",
      }),
      {
        params: Promise.resolve({ commentId: "comment-1" }),
      },
    );

    expect(response.status).toBe(404);
    expect(vi.mocked(toggleCommentLikeRecord)).not.toHaveBeenCalled();
  });

  it("returns 500 when comment lookup fails unexpectedly", async () => {
    vi.mocked(checkRateLimit).mockResolvedValue({
      allowed: true,
      limit: 30,
      remaining: 29,
      resetAt: Date.now() + 60_000,
    });
    vi.mocked(getRequestPublicUser).mockResolvedValue(makePublicUser());
    vi.mocked(commentExists).mockRejectedValue(new Error("lookup failed"));

    const response = await POST(
      new Request("http://localhost/api/comments/comment-1/like", {
        method: "POST",
      }),
      {
        params: Promise.resolve({ commentId: "comment-1" }),
      },
    );

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({
      error: "Failed to update comment like",
    });
  });

  it("returns 500 when the like toggle fails unexpectedly", async () => {
    vi.mocked(checkRateLimit).mockResolvedValue({
      allowed: true,
      limit: 30,
      remaining: 29,
      resetAt: Date.now() + 60_000,
    });
    vi.mocked(getRequestPublicUser).mockResolvedValue(makePublicUser());
    vi.mocked(commentExists).mockResolvedValue(true);
    const dbError = new Error("toggle failed");
    vi.mocked(toggleCommentLikeRecord).mockRejectedValue(dbError);

    const response = await POST(
      new Request("http://localhost/api/comments/comment-1/like", {
        method: "POST",
      }),
      {
        params: Promise.resolve({ commentId: "comment-1" }),
      },
    );

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({
      error: "Failed to update comment like",
    });
    expect(vi.mocked(captureException)).toHaveBeenCalledWith(
      dbError,
      expect.objectContaining({
        route: "comment-like",
        commentId: "comment-1",
      }),
    );
  });

  it("toggles likes for visible comments", async () => {
    vi.mocked(checkRateLimit).mockResolvedValue({
      allowed: true,
      limit: 30,
      remaining: 29,
      resetAt: Date.now() + 60_000,
    });
    vi.mocked(getRequestPublicUser).mockResolvedValue(makePublicUser());
    vi.mocked(commentExists).mockResolvedValue(true);
    vi.mocked(toggleCommentLikeRecord).mockResolvedValue({ liked: true });

    const response = await POST(
      new Request("http://localhost/api/comments/comment-1/like", {
        method: "POST",
      }),
      {
        params: Promise.resolve({ commentId: "comment-1" }),
      },
    );

    expect(response.status).toBe(201);
    expect(vi.mocked(toggleCommentLikeRecord)).toHaveBeenCalledWith(
      "comment-1",
      "reader-1",
    );
    expect(vi.mocked(checkRateLimit)).toHaveBeenCalledWith(
      "like:reader-1:127.0.0.1",
      30,
      60_000,
    );
    expect(await response.json()).toEqual({ liked: true });
  });

  it("returns the rate limit response when throttled", async () => {
    const throttledResponse = NextResponse.json(
      { error: "Too many requests" },
      { status: 429 },
    );
    vi.mocked(checkRateLimit).mockResolvedValue({
      allowed: false,
      limit: 30,
      remaining: 0,
      resetAt: Date.now() + 60_000,
    });
    vi.mocked(tooManyRequests).mockReturnValue(throttledResponse);

    const response = await POST(
      new Request("http://localhost/api/comments/comment-1/like", {
        method: "POST",
      }),
      {
        params: Promise.resolve({ commentId: "comment-1" }),
      },
    );

    expect(response).toBe(throttledResponse);
    expect(vi.mocked(getRequestPublicUser)).toHaveBeenCalledTimes(1);
  });
});
