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

vi.mock("@/server/dal/comments", () => ({
  listCommentsForAdmin: vi.fn(),
}));

import { GET } from "@/app/api/admin/posts/[postId]/comments/route";
import { requireAdminSession } from "@/lib/auth/session";
import { checkRateLimit, tooManyRequests } from "@/lib/rate-limit";
import { listCommentsForAdmin } from "@/server/dal/comments";

const MOCK_ADMIN_SESSION = {
  user: { id: "admin-1", email: "admin@example.com", name: "Admin" },
  expires: new Date(Date.now() + 1000 * 60 * 60).toISOString(),
};

const MOCK_COMMENTS = [
  {
    id: "comment-1",
    postId: "post-1",
    authorId: "user-1",
    authorDisplayName: "Traveler",
    authorAvatarUrl: null,
    content: "Great post",
    parentId: null,
    createdAt: new Date("2026-03-20T10:00:00Z"),
    updatedAt: new Date("2026-03-20T10:00:00Z"),
    likeCount: 2,
    userHasLiked: false,
    canDelete: false,
    visibility: "visible" as const,
    isFlagged: false,
    moderatedAt: null,
    moderatedByUserId: null,
    canLike: true,
  },
];

describe("GET /api/admin/posts/[postId]/comments", () => {
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

    const response = await GET(new Request("http://localhost/api/admin/posts/post-1/comments"), {
      params: Promise.resolve({ postId: "post-1" }),
    });

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "Unauthorized" });
  });

  it("returns the throttled response when rate limited", async () => {
    vi.mocked(requireAdminSession).mockResolvedValue(MOCK_ADMIN_SESSION);
    vi.mocked(checkRateLimit).mockResolvedValue({ allowed: false, limit: 120, remaining: 0, resetAt: Date.now() + 60_000 });
    const throttled = NextResponse.json({ error: "Too many requests" }, { status: 429 });
    vi.mocked(tooManyRequests).mockReturnValue(throttled);

    const response = await GET(new Request("http://localhost/api/admin/posts/post-1/comments"), {
      params: Promise.resolve({ postId: "post-1" }),
    });

    expect(response).toBe(throttled);
    expect(vi.mocked(listCommentsForAdmin)).not.toHaveBeenCalled();
  });

  it("returns 400 for whitespace-only post ids", async () => {
    vi.mocked(requireAdminSession).mockResolvedValue(MOCK_ADMIN_SESSION);

    const response = await GET(new Request("http://localhost/api/admin/posts/%20%20%20/comments"), {
      params: Promise.resolve({ postId: "   " }),
    });

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "Invalid post id" });
  });

  it("returns 400 for invalid sort options", async () => {
    vi.mocked(requireAdminSession).mockResolvedValue(MOCK_ADMIN_SESSION);

    const response = await GET(new Request("http://localhost/api/admin/posts/post-1/comments?sort=bad"), {
      params: Promise.resolve({ postId: "post-1" }),
    });

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "Invalid sort option" });
  });

  it("returns 500 for unexpected lookup failures", async () => {
    vi.mocked(requireAdminSession).mockResolvedValue(MOCK_ADMIN_SESSION);
    vi.mocked(listCommentsForAdmin).mockRejectedValue(new Error("database offline"));

    const response = await GET(new Request("http://localhost/api/admin/posts/post-1/comments?sort=likes"), {
      params: Promise.resolve({ postId: "post-1" }),
    });

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: "Failed to load comments" });
  });

  it("returns moderation comments for valid requests", async () => {
    vi.mocked(requireAdminSession).mockResolvedValue(MOCK_ADMIN_SESSION);
    vi.mocked(listCommentsForAdmin).mockResolvedValue(MOCK_COMMENTS);

    const response = await GET(new Request("http://localhost/api/admin/posts/post-1/comments?sort=oldest"), {
      params: Promise.resolve({ postId: "post-1" }),
    });

    expect(response.status).toBe(200);
    expect(vi.mocked(listCommentsForAdmin)).toHaveBeenCalledWith("post-1", "oldest");
    expect(await response.json()).toEqual({
      comments: [
        {
          ...MOCK_COMMENTS[0],
          createdAt: "2026-03-20T10:00:00.000Z",
          updatedAt: "2026-03-20T10:00:00.000Z",
        },
      ],
    });
  });
});
