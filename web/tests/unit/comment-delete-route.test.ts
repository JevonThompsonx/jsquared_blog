import { afterEach, describe, expect, it, vi } from "vitest";
import { NextResponse } from "next/server";

vi.mock("@/server/auth/public-users", () => ({
  getRequestPublicUser: vi.fn(),
}));

vi.mock("@/server/dal/comments", () => ({
  deleteCommentRecord: vi.fn(),
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

import { DELETE } from "@/app/api/comments/[commentId]/route";
import { getRequestPublicUser } from "@/server/auth/public-users";
import { checkRateLimit, tooManyRequests } from "@/lib/rate-limit";
import { captureException } from "@/lib/sentry";
import { deleteCommentRecord } from "@/server/dal/comments";

function makePublicUser(id = "reader-1") {
  return {
    id,
    email: "reader@example.com",
    displayName: "Reader",
    avatarUrl: null,
  };
}

describe("DELETE /api/comments/[commentId]", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns 400 for an invalid comment id", async () => {
    const response = await DELETE(
      new Request("http://localhost/api/comments/invalid id", {
        method: "DELETE",
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

    const response = await DELETE(
      new Request("http://localhost/api/comments/comment-1", {
        method: "DELETE",
      }),
      {
        params: Promise.resolve({ commentId: "comment-1" }),
      },
    );

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "Unauthorized" });
    expect(vi.mocked(checkRateLimit)).not.toHaveBeenCalled();
  });

  it("returns the throttled response when rate limited", async () => {
    vi.mocked(getRequestPublicUser).mockResolvedValue(makePublicUser());
    vi.mocked(checkRateLimit).mockResolvedValue({
      allowed: false,
      limit: 20,
      remaining: 0,
      resetAt: Date.now() + 60_000,
    });
    const throttledResponse = NextResponse.json(
      { error: "Too many requests" },
      { status: 429 },
    );
    vi.mocked(tooManyRequests).mockReturnValue(throttledResponse);

    const response = await DELETE(
      new Request("http://localhost/api/comments/comment-1", {
        method: "DELETE",
      }),
      {
        params: Promise.resolve({ commentId: "comment-1" }),
      },
    );

    expect(response).toBe(throttledResponse);
  });

  it("returns 404 when the comment cannot be deleted", async () => {
    vi.mocked(getRequestPublicUser).mockResolvedValue(makePublicUser());
    vi.mocked(checkRateLimit).mockResolvedValue({
      allowed: true,
      limit: 20,
      remaining: 19,
      resetAt: Date.now() + 60_000,
    });
    vi.mocked(deleteCommentRecord).mockResolvedValue(false);

    const response = await DELETE(
      new Request("http://localhost/api/comments/comment-1", {
        method: "DELETE",
      }),
      {
        params: Promise.resolve({ commentId: "comment-1" }),
      },
    );

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: "Comment not found" });
  });

  it("returns 500 when delete fails unexpectedly", async () => {
    vi.mocked(getRequestPublicUser).mockResolvedValue(makePublicUser());
    vi.mocked(checkRateLimit).mockResolvedValue({
      allowed: true,
      limit: 20,
      remaining: 19,
      resetAt: Date.now() + 60_000,
    });
    const dbError = new Error("delete failed");
    vi.mocked(deleteCommentRecord).mockRejectedValue(dbError);

    const response = await DELETE(
      new Request("http://localhost/api/comments/comment-1", {
        method: "DELETE",
      }),
      {
        params: Promise.resolve({ commentId: "comment-1" }),
      },
    );

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({
      error: "Failed to delete comment",
    });
    expect(vi.mocked(captureException)).toHaveBeenCalledWith(
      dbError,
      expect.objectContaining({
        route: "comment-delete",
        commentId: "comment-1",
      }),
    );
  });

  it("returns success when the caller deletes their own comment", async () => {
    vi.mocked(getRequestPublicUser).mockResolvedValue(makePublicUser());
    vi.mocked(checkRateLimit).mockResolvedValue({
      allowed: true,
      limit: 20,
      remaining: 19,
      resetAt: Date.now() + 60_000,
    });
    vi.mocked(deleteCommentRecord).mockResolvedValue(true);

    const response = await DELETE(
      new Request("http://localhost/api/comments/comment-1", {
        method: "DELETE",
      }),
      {
        params: Promise.resolve({ commentId: "comment-1" }),
      },
    );

    expect(response.status).toBe(200);
    expect(vi.mocked(deleteCommentRecord)).toHaveBeenCalledWith(
      "comment-1",
      "reader-1",
    );
    expect(await response.json()).toEqual({ ok: true });
  });
});
