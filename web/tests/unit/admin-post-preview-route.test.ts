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

vi.mock("@/server/posts/preview", () => ({
  createPostPreviewAccess: vi.fn(),
}));

import { POST } from "@/app/api/admin/posts/preview/route";
import { requireAdminSession } from "@/lib/auth/session";
import { checkRateLimit, tooManyRequests } from "@/lib/rate-limit";
import { createPostPreviewAccess } from "@/server/posts/preview";

function makeAdminSession(): AdminSession {
  return {
    expires: "2099-01-01T00:00:00.000Z",
    user: {
      id: "admin-1",
      role: "admin",
    },
  };
}

describe("POST /api/admin/posts/preview", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("rejects unauthenticated requests", async () => {
    vi.mocked(requireAdminSession).mockResolvedValue(null);

    const response = await POST(
      new Request("http://localhost/api/admin/posts/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId: "post-1" }),
      }),
    );

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "Unauthorized" });
  });

  it("returns the throttled response when rate limited", async () => {
    vi.mocked(requireAdminSession).mockResolvedValue(makeAdminSession());
    vi.mocked(checkRateLimit).mockResolvedValue({
      allowed: false,
      limit: 30,
      remaining: 0,
      resetAt: Date.now() + 60_000,
    });
    const throttled = NextResponse.json({ error: "Too many requests" }, { status: 429 });
    vi.mocked(tooManyRequests).mockReturnValue(throttled);

    const response = await POST(
      new Request("http://localhost/api/admin/posts/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId: "post-1" }),
      }),
    );

    expect(response).toBe(throttled);
    expect(vi.mocked(createPostPreviewAccess)).not.toHaveBeenCalled();
  });

  it("returns not found without exposing internal details", async () => {
    vi.mocked(requireAdminSession).mockResolvedValue(makeAdminSession());
    vi.mocked(checkRateLimit).mockResolvedValue({
      allowed: true,
      limit: 30,
      remaining: 29,
      resetAt: Date.now() + 60_000,
    });
    vi.mocked(createPostPreviewAccess).mockRejectedValue(new Error("post not found in drafts"));

    const response = await POST(
      new Request("http://localhost/api/admin/posts/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId: "post-1" }),
      }),
    );

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: "Post not found" });
  });

  it("rejects whitespace-only post ids with a safe validation error", async () => {
    vi.mocked(requireAdminSession).mockResolvedValue(makeAdminSession());
    vi.mocked(checkRateLimit).mockResolvedValue({
      allowed: true,
      limit: 30,
      remaining: 29,
      resetAt: Date.now() + 60_000,
    });

    const response = await POST(
      new Request("http://localhost/api/admin/posts/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId: "   " }),
      }),
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "Invalid preview request" });
    expect(vi.mocked(createPostPreviewAccess)).not.toHaveBeenCalled();
  });

  it("returns preview payload for valid requests", async () => {
    vi.mocked(requireAdminSession).mockResolvedValue(makeAdminSession());
    vi.mocked(checkRateLimit).mockResolvedValue({
      allowed: true,
      limit: 30,
      remaining: 29,
      resetAt: Date.now() + 60_000,
    });
    vi.mocked(createPostPreviewAccess).mockResolvedValue({
      postId: "post-1",
      token: "token-1",
      previewPath: "/preview/abc123",
      expiresAt: "2099-01-01T00:05:00.000Z",
    });

    const response = await POST(
      new Request("http://localhost/api/admin/posts/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId: "post-1" }),
      }),
    );

    expect(response.status).toBe(201);
    expect(vi.mocked(createPostPreviewAccess)).toHaveBeenCalledWith("post-1", "admin-1");
    expect(await response.json()).toEqual({
      postId: "post-1",
      token: "token-1",
      previewPath: "/preview/abc123",
      expiresAt: "2099-01-01T00:05:00.000Z",
    });
  });

  it("trims valid preview post ids before delegating", async () => {
    vi.mocked(requireAdminSession).mockResolvedValue(makeAdminSession());
    vi.mocked(checkRateLimit).mockResolvedValue({
      allowed: true,
      limit: 30,
      remaining: 29,
      resetAt: Date.now() + 60_000,
    });
    vi.mocked(createPostPreviewAccess).mockResolvedValue({
      postId: "post-1",
      token: "token-1",
      previewPath: "/preview/abc123",
      expiresAt: "2099-01-01T00:05:00.000Z",
    });

    const response = await POST(
      new Request("http://localhost/api/admin/posts/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId: "  post-1  " }),
      }),
    );

    expect(response.status).toBe(201);
    expect(vi.mocked(createPostPreviewAccess)).toHaveBeenCalledWith("post-1", "admin-1");
  });

  it("returns a safe 500 when preview creation fails unexpectedly", async () => {
    vi.mocked(requireAdminSession).mockResolvedValue(makeAdminSession());
    vi.mocked(checkRateLimit).mockResolvedValue({
      allowed: true,
      limit: 30,
      remaining: 29,
      resetAt: Date.now() + 60_000,
    });
    vi.mocked(createPostPreviewAccess).mockRejectedValue(new Error("token service offline"));

    const response = await POST(
      new Request("http://localhost/api/admin/posts/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId: "post-1" }),
      }),
    );

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: "Failed to create preview" });
  });
});
