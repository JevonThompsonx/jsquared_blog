import type { AdminSession } from "@/lib/auth/session";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth/session", () => ({
  requireAdminSession: vi.fn(),
}));

vi.mock("@/server/dal/comments", () => ({
  moderateCommentsByIds: vi.fn(),
}));

import { requireAdminSession } from "@/lib/auth/session";
import { moderateCommentsByIds } from "@/server/dal/comments";
import { POST } from "@/app/api/admin/comments/moderate/route";

describe("POST /api/admin/comments/moderate", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  function makeAdminSession(): AdminSession {
    return {
      expires: "2099-01-01T00:00:00.000Z",
      user: {
        id: "admin-1",
        role: "admin",
      },
    };
  }

  it("rejects unauthenticated requests", async () => {
    vi.mocked(requireAdminSession).mockResolvedValue(null);

    const response = await POST(
      new Request("http://localhost/api/admin/comments/moderate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ commentIds: [crypto.randomUUID()], action: "hide" }),
      }),
    );

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "Unauthorized" });
  });

  it("validates the payload before calling moderation logic", async () => {
    vi.mocked(requireAdminSession).mockResolvedValue(makeAdminSession());

    const response = await POST(
      new Request("http://localhost/api/admin/comments/moderate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ commentIds: ["bad id with spaces"], action: "hide" }),
      }),
    );

    expect(response.status).toBe(400);
    expect(vi.mocked(moderateCommentsByIds)).not.toHaveBeenCalled();
  });

  it("returns moderation results for valid admin requests", async () => {
    const commentId = crypto.randomUUID();
    vi.mocked(requireAdminSession).mockResolvedValue(makeAdminSession());
    vi.mocked(moderateCommentsByIds).mockResolvedValue({
      action: "hide",
      updatedCount: 1,
      unchangedCount: 0,
      missingIds: [],
      comments: [
        {
          commentId,
          postId: "post-1",
          visibility: "hidden",
          isFlagged: false,
          moderatedAt: "2026-03-17T12:00:00.000Z",
          moderatedByUserId: "admin-1",
          changed: true,
        },
      ],
    });

    const response = await POST(
      new Request("http://localhost/api/admin/comments/moderate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ commentIds: [commentId], action: "hide" }),
      }),
    );

    expect(response.status).toBe(200);
    expect(vi.mocked(moderateCommentsByIds)).toHaveBeenCalledWith([commentId], "hide", "admin-1");
    expect(await response.json()).toEqual({
      action: "hide",
      updatedCount: 1,
      unchangedCount: 0,
      missingIds: [],
      comments: [
        {
          commentId,
          postId: "post-1",
          visibility: "hidden",
          isFlagged: false,
          moderatedAt: "2026-03-17T12:00:00.000Z",
          moderatedByUserId: "admin-1",
          changed: true,
        },
      ],
    });
  });
});
