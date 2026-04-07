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

vi.mock("@/server/posts/clone", () => ({
  clonePostById: vi.fn(),
}));

import { POST } from "@/app/api/admin/posts/clone/route";
import { requireAdminSession } from "@/lib/auth/session";
import { checkRateLimit, tooManyRequests } from "@/lib/rate-limit";
import { clonePostById } from "@/server/posts/clone";

function makeAdminSession(): AdminSession {
  return {
    expires: "2099-01-01T00:00:00.000Z",
    user: {
      id: "admin-1",
      role: "admin",
    },
  };
}

describe("POST /api/admin/posts/clone", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("rejects unauthenticated requests", async () => {
    vi.mocked(requireAdminSession).mockResolvedValue(null);

    const response = await POST(
      new Request("http://localhost/api/admin/posts/clone", {
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
      limit: 20,
      remaining: 0,
      resetAt: Date.now() + 60_000,
    });
    const throttled = NextResponse.json({ error: "Too many requests" }, { status: 429 });
    vi.mocked(tooManyRequests).mockReturnValue(throttled);

    const response = await POST(
      new Request("http://localhost/api/admin/posts/clone", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId: "post-1" }),
      }),
    );

    expect(response).toBe(throttled);
    expect(vi.mocked(clonePostById)).not.toHaveBeenCalled();
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
      new Request("http://localhost/api/admin/posts/clone", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId: "" }),
      }),
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "Invalid clone request" });
  });

  it("returns not found without exposing internal details", async () => {
    vi.mocked(requireAdminSession).mockResolvedValue(makeAdminSession());
    vi.mocked(checkRateLimit).mockResolvedValue({
      allowed: true,
      limit: 20,
      remaining: 19,
      resetAt: Date.now() + 60_000,
    });
    vi.mocked(clonePostById).mockRejectedValue(new Error("Post post-1 not found in source table"));

    const response = await POST(
      new Request("http://localhost/api/admin/posts/clone", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId: "post-1" }),
      }),
    );

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: "Post not found" });
  });

  it("returns cloned post metadata for valid requests", async () => {
    vi.mocked(requireAdminSession).mockResolvedValue(makeAdminSession());
    vi.mocked(checkRateLimit).mockResolvedValue({
      allowed: true,
      limit: 20,
      remaining: 19,
      resetAt: Date.now() + 60_000,
    });
    vi.mocked(clonePostById).mockResolvedValue({
      postId: "cloned-post-1",
      slug: "patagonia-notes-copy",
      title: "Copy of Patagonia Notes",
      status: "draft",
    });

    const response = await POST(
      new Request("http://localhost/api/admin/posts/clone", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId: "post-1" }),
      }),
    );

    expect(response.status).toBe(201);
    expect(vi.mocked(clonePostById)).toHaveBeenCalledWith("post-1");
    expect(await response.json()).toEqual({
      postId: "cloned-post-1",
      slug: "patagonia-notes-copy",
      title: "Copy of Patagonia Notes",
      status: "draft",
    });
  });
});
