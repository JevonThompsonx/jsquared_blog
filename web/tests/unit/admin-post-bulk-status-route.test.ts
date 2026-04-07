import type { AdminSession } from "@/lib/auth/session";

import { afterEach, describe, expect, it, vi } from "vitest";
import { NextResponse } from "next/server";

vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: vi.fn(),
  getClientIp: vi.fn(() => "127.0.0.1"),
  tooManyRequests: vi.fn(() => NextResponse.json({ error: "Too many requests" }, { status: 429 })),
}));

vi.mock("@/lib/auth/session", () => ({
  requireAdminSession: vi.fn(),
}));

vi.mock("@/server/posts/publish", () => ({
  publishPosts: vi.fn(),
  unpublishPosts: vi.fn(),
}));

import { POST } from "@/app/api/admin/posts/bulk-status/route";
import { requireAdminSession } from "@/lib/auth/session";
import { checkRateLimit, tooManyRequests } from "@/lib/rate-limit";
import { publishPosts, unpublishPosts } from "@/server/posts/publish";

function makeAdminSession(): AdminSession {
  return {
    expires: "2099-01-01T00:00:00.000Z",
    user: {
      id: "admin-1",
      role: "admin",
    },
  };
}

describe("POST /api/admin/posts/bulk-status", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("rejects unauthenticated requests", async () => {
    vi.mocked(requireAdminSession).mockResolvedValue(null);

    const response = await POST(
      new Request("http://localhost/api/admin/posts/bulk-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postIds: ["post-1"], status: "published" }),
      }),
    );

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "Unauthorized" });
  });

  it("returns the throttled response when rate limited", async () => {
    vi.mocked(requireAdminSession).mockResolvedValue(makeAdminSession());
    vi.mocked(checkRateLimit).mockResolvedValue({
      allowed: false,
      limit: 20,
      remaining: 0,
      resetAt: Date.now() + 60_000,
    });
    const throttled = NextResponse.json({ error: "Too many requests" }, { status: 429 });
    vi.mocked(tooManyRequests).mockReturnValue(throttled);

    const response = await POST(
      new Request("http://localhost/api/admin/posts/bulk-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postIds: ["post-1"], status: "published" }),
      }),
    );

    expect(response).toBe(throttled);
    expect(vi.mocked(publishPosts)).not.toHaveBeenCalled();
    expect(vi.mocked(unpublishPosts)).not.toHaveBeenCalled();
  });

  it("returns safe validation errors", async () => {
    vi.mocked(requireAdminSession).mockResolvedValue(makeAdminSession());
    vi.mocked(checkRateLimit).mockResolvedValue({
      allowed: true,
      limit: 20,
      remaining: 19,
      resetAt: Date.now() + 60_000,
    });

    const response = await POST(
      new Request("http://localhost/api/admin/posts/bulk-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postIds: [], status: "published" }),
      }),
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "Invalid bulk update request" });
  });

  it("publishes posts when the requested status is published", async () => {
    vi.mocked(requireAdminSession).mockResolvedValue(makeAdminSession());
    vi.mocked(checkRateLimit).mockResolvedValue({
      allowed: true,
      limit: 20,
      remaining: 19,
      resetAt: Date.now() + 60_000,
    });
    vi.mocked(publishPosts).mockResolvedValue({
      operation: "publish",
      requestedCount: 2,
      updated: 2,
      updatedCount: 2,
      unchangedCount: 0,
      missingIds: [],
      updatedPostIds: ["post-1", "post-2"],
      unchangedPostIds: [],
    });

    const response = await POST(
      new Request("http://localhost/api/admin/posts/bulk-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postIds: ["post-1", "post-2"], status: "published" }),
      }),
    );

    expect(response.status).toBe(200);
    expect(vi.mocked(publishPosts)).toHaveBeenCalledWith(["post-1", "post-2"]);
    expect(vi.mocked(unpublishPosts)).not.toHaveBeenCalled();
    expect(await response.json()).toEqual({
      operation: "publish",
      requestedCount: 2,
      updated: 2,
      updatedCount: 2,
      unchangedCount: 0,
      missingIds: [],
      updatedPostIds: ["post-1", "post-2"],
      unchangedPostIds: [],
    });
  });

  it("unpublishes posts when the requested status is draft", async () => {
    vi.mocked(requireAdminSession).mockResolvedValue(makeAdminSession());
    vi.mocked(checkRateLimit).mockResolvedValue({
      allowed: true,
      limit: 20,
      remaining: 19,
      resetAt: Date.now() + 60_000,
    });
    vi.mocked(unpublishPosts).mockResolvedValue({
      operation: "unpublish",
      requestedCount: 1,
      updated: 1,
      updatedCount: 1,
      unchangedCount: 0,
      missingIds: [],
      updatedPostIds: ["post-1"],
      unchangedPostIds: [],
    });

    const response = await POST(
      new Request("http://localhost/api/admin/posts/bulk-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postIds: ["post-1"], status: "draft" }),
      }),
    );

    expect(response.status).toBe(200);
    expect(vi.mocked(unpublishPosts)).toHaveBeenCalledWith(["post-1"]);
    expect(vi.mocked(publishPosts)).not.toHaveBeenCalled();
    expect(await response.json()).toEqual({
      operation: "unpublish",
      requestedCount: 1,
      updated: 1,
      updatedCount: 1,
      unchangedCount: 0,
      missingIds: [],
      updatedPostIds: ["post-1"],
      unchangedPostIds: [],
    });
  });
});
