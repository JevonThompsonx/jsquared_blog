import type { User } from "@supabase/supabase-js";

import { afterEach, describe, expect, it, vi } from "vitest";
import { NextResponse } from "next/server";

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

vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: vi.fn(),
  getClientIp: vi.fn(() => "127.0.0.1"),
  tooManyRequests: vi.fn(() => NextResponse.json({ error: "Too many requests" }, { status: 429 })),
}));

import { POST } from "@/app/api/posts/[postId]/comments/route";
import { checkRateLimit } from "@/lib/rate-limit";
import { getRequestSupabaseUser } from "@/lib/supabase/server";
import { ensurePublicAppUser } from "@/server/auth/public-users";
import { canCommentOnPost, canReplyToComment, createCommentRecord, listCommentsForPost } from "@/server/dal/comments";
import { sendCommentNotification } from "@/server/services/comment-notifications";

function makeSupabaseUser(id = "supabase-user-1"): User {
  return {
    id,
    app_metadata: {},
    user_metadata: {},
    aud: "authenticated",
    created_at: "2026-01-01T00:00:00.000Z",
  };
}

describe("POST /api/posts/[postId]/comments", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when the caller is unauthenticated", async () => {
    vi.mocked(getRequestSupabaseUser).mockResolvedValue(null);

    const response = await POST(
      new Request("http://localhost/api/posts/post-1/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: "Looks great" }),
      }),
      { params: Promise.resolve({ postId: "post-1" }) },
    );

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "Unauthorized" });
    expect(vi.mocked(checkRateLimit)).not.toHaveBeenCalled();
  });

  it("returns 400 for invalid JSON payloads", async () => {
    vi.mocked(checkRateLimit).mockResolvedValue({ allowed: true, limit: 5, remaining: 4, resetAt: Date.now() + 60_000 });
    vi.mocked(getRequestSupabaseUser).mockResolvedValue(makeSupabaseUser());
    vi.mocked(canCommentOnPost).mockResolvedValue(true);

    const response = await POST(
      new Request("http://localhost/api/posts/post-1/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{",
      }),
      { params: Promise.resolve({ postId: "post-1" }) },
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "Invalid JSON payload" });
  });

  it("returns a generic 400 for invalid comment payloads", async () => {
    vi.mocked(checkRateLimit).mockResolvedValue({ allowed: true, limit: 5, remaining: 4, resetAt: Date.now() + 60_000 });
    vi.mocked(getRequestSupabaseUser).mockResolvedValue(makeSupabaseUser());
    vi.mocked(canCommentOnPost).mockResolvedValue(true);

    const response = await POST(
      new Request("http://localhost/api/posts/post-1/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: "" }),
      }),
      { params: Promise.resolve({ postId: "post-1" }) },
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "Invalid comment payload" });
  });

  it("returns 404 when the parent comment is missing", async () => {
    vi.mocked(checkRateLimit).mockResolvedValue({ allowed: true, limit: 5, remaining: 4, resetAt: Date.now() + 60_000 });
    vi.mocked(getRequestSupabaseUser).mockResolvedValue(makeSupabaseUser());
    vi.mocked(canCommentOnPost).mockResolvedValue(true);
    vi.mocked(canReplyToComment).mockResolvedValue(false);

    const response = await POST(
      new Request("http://localhost/api/posts/post-1/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: "Replying here", parentId: "comment-root-1" }),
      }),
      { params: Promise.resolve({ postId: "post-1" }) },
    );

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: "Parent comment not found" });
    expect(vi.mocked(createCommentRecord)).not.toHaveBeenCalled();
  });

  it("returns a safe 500 when post visibility lookup fails unexpectedly", async () => {
    vi.mocked(checkRateLimit).mockResolvedValue({ allowed: true, limit: 5, remaining: 4, resetAt: Date.now() + 60_000 });
    vi.mocked(getRequestSupabaseUser).mockResolvedValue(makeSupabaseUser());
    vi.mocked(canCommentOnPost).mockRejectedValue(new Error("post lookup failed"));

    const response = await POST(
      new Request("http://localhost/api/posts/post-1/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: "Looks great" }),
      }),
      { params: Promise.resolve({ postId: "post-1" }) },
    );

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: "Failed to create comment" });
  });

  it("returns a safe 500 when parent lookup fails unexpectedly", async () => {
    vi.mocked(checkRateLimit).mockResolvedValue({ allowed: true, limit: 5, remaining: 4, resetAt: Date.now() + 60_000 });
    vi.mocked(getRequestSupabaseUser).mockResolvedValue(makeSupabaseUser());
    vi.mocked(canCommentOnPost).mockResolvedValue(true);
    vi.mocked(canReplyToComment).mockRejectedValue(new Error("reply lookup failed"));

    const response = await POST(
      new Request("http://localhost/api/posts/post-1/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: "Replying here", parentId: "comment-root-1" }),
      }),
      { params: Promise.resolve({ postId: "post-1" }) },
    );

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: "Failed to create comment" });
  });

  it("returns success and sends notifications for top-level comments", async () => {
    vi.mocked(checkRateLimit).mockResolvedValue({ allowed: true, limit: 5, remaining: 4, resetAt: Date.now() + 60_000 });
    vi.mocked(getRequestSupabaseUser).mockResolvedValue(makeSupabaseUser());
    vi.mocked(canCommentOnPost).mockResolvedValue(true);
    vi.mocked(ensurePublicAppUser).mockResolvedValue({
      id: "public-user-1",
      supabaseUserId: "supabase-user-1",
      email: "reader@example.com",
      displayName: "Reader",
      avatarUrl: null,
    });
    vi.mocked(createCommentRecord).mockResolvedValue({
      id: "comment-1",
      content: "Looks great",
      parentId: null,
      createdAt: new Date("2026-03-19T12:00:00.000Z"),
      authorDisplayName: "Reader",
      post: {
        id: "post-1",
        title: "Patagonia Notes",
        slug: "patagonia-notes",
      },
    });
    vi.mocked(sendCommentNotification).mockResolvedValue({ status: "sent" });
    vi.mocked(listCommentsForPost).mockResolvedValue([]);

    const response = await POST(
      new Request("http://localhost/api/posts/post-1/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: "Looks great" }),
      }),
      { params: Promise.resolve({ postId: "post-1" }) },
    );

    expect(response.status).toBe(201);
    expect(vi.mocked(createCommentRecord)).toHaveBeenCalledWith("post-1", "public-user-1", "Looks great", null);
    expect(vi.mocked(sendCommentNotification)).toHaveBeenCalledTimes(1);
    expect(vi.mocked(checkRateLimit)).toHaveBeenCalledWith("comment:supabase-user-1:127.0.0.1", 5, 60_000);
  });

  it("returns success when notification delivery fails after comment persistence", async () => {
    vi.mocked(checkRateLimit).mockResolvedValue({ allowed: true, limit: 5, remaining: 4, resetAt: Date.now() + 60_000 });
    vi.mocked(getRequestSupabaseUser).mockResolvedValue(makeSupabaseUser());
    vi.mocked(canCommentOnPost).mockResolvedValue(true);
    vi.mocked(ensurePublicAppUser).mockResolvedValue({
      id: "public-user-1",
      supabaseUserId: "supabase-user-1",
      email: "reader@example.com",
      displayName: "Reader",
      avatarUrl: null,
    });
    vi.mocked(createCommentRecord).mockResolvedValue({
      id: "comment-1",
      content: "Replying here",
      parentId: "comment-root-1",
      createdAt: new Date("2026-03-19T12:00:00.000Z"),
      authorDisplayName: "Reader",
      post: {
        id: "post-1",
        title: "Patagonia Notes",
        slug: "patagonia-notes",
      },
    });
    vi.mocked(canReplyToComment).mockResolvedValue(true);
    vi.mocked(sendCommentNotification).mockResolvedValue({ status: "failed", reason: "send-error" });
    vi.mocked(listCommentsForPost).mockResolvedValue([]);

    const response = await POST(
      new Request("http://localhost/api/posts/post-1/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: "Replying here", parentId: "comment-root-1" }),
      }),
      { params: Promise.resolve({ postId: "post-1" }) },
    );

    expect(response.status).toBe(201);
    expect(vi.mocked(canReplyToComment)).toHaveBeenCalledWith("post-1", "comment-root-1");
    expect(vi.mocked(sendCommentNotification)).toHaveBeenCalledTimes(1);
    expect(await response.json()).toEqual({ comments: [] });
  });

  it("returns success when notification sending throws after comment persistence", async () => {
    vi.mocked(checkRateLimit).mockResolvedValue({ allowed: true, limit: 5, remaining: 4, resetAt: Date.now() + 60_000 });
    vi.mocked(getRequestSupabaseUser).mockResolvedValue(makeSupabaseUser());
    vi.mocked(canCommentOnPost).mockResolvedValue(true);
    vi.mocked(ensurePublicAppUser).mockResolvedValue({
      id: "public-user-1",
      supabaseUserId: "supabase-user-1",
      email: "reader@example.com",
      displayName: "Reader",
      avatarUrl: null,
    });
    vi.mocked(createCommentRecord).mockResolvedValue({
      id: "comment-1",
      content: "Looks great",
      parentId: null,
      createdAt: new Date("2026-03-19T12:00:00.000Z"),
      authorDisplayName: "Reader",
      post: {
        id: "post-1",
        title: "Patagonia Notes",
        slug: "patagonia-notes",
      },
    });
    vi.mocked(sendCommentNotification).mockRejectedValue(new Error("email offline"));
    vi.mocked(listCommentsForPost).mockResolvedValue([]);

    const response = await POST(
      new Request("http://localhost/api/posts/post-1/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: "Looks great" }),
      }),
      { params: Promise.resolve({ postId: "post-1" }) },
    );

    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ comments: [] });
  });

  it("returns a safe 500 when comment creation fails unexpectedly", async () => {
    vi.mocked(checkRateLimit).mockResolvedValue({ allowed: true, limit: 5, remaining: 4, resetAt: Date.now() + 60_000 });
    vi.mocked(getRequestSupabaseUser).mockResolvedValue(makeSupabaseUser());
    vi.mocked(canCommentOnPost).mockResolvedValue(true);
    vi.mocked(ensurePublicAppUser).mockResolvedValue({
      id: "public-user-1",
      supabaseUserId: "supabase-user-1",
      email: "reader@example.com",
      displayName: "Reader",
      avatarUrl: null,
    });
    vi.mocked(createCommentRecord).mockRejectedValue(new Error("database offline"));

    const response = await POST(
      new Request("http://localhost/api/posts/post-1/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: "Looks great" }),
      }),
      { params: Promise.resolve({ postId: "post-1" }) },
    );

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: "Failed to create comment" });
  });

  it("returns success without replacing comments when listing fails unexpectedly after creation", async () => {
    vi.mocked(checkRateLimit).mockResolvedValue({ allowed: true, limit: 5, remaining: 4, resetAt: Date.now() + 60_000 });
    vi.mocked(getRequestSupabaseUser).mockResolvedValue(makeSupabaseUser());
    vi.mocked(canCommentOnPost).mockResolvedValue(true);
    vi.mocked(ensurePublicAppUser).mockResolvedValue({
      id: "public-user-1",
      supabaseUserId: "supabase-user-1",
      email: "reader@example.com",
      displayName: "Reader",
      avatarUrl: null,
    });
    vi.mocked(createCommentRecord).mockResolvedValue({
      id: "comment-1",
      content: "Looks great",
      parentId: null,
      createdAt: new Date("2026-03-19T12:00:00.000Z"),
      authorDisplayName: "Reader",
      post: {
        id: "post-1",
        title: "Patagonia Notes",
        slug: "patagonia-notes",
      },
    });
    vi.mocked(sendCommentNotification).mockResolvedValue({ status: "sent" });
    vi.mocked(listCommentsForPost).mockRejectedValue(new Error("list failed"));

    const response = await POST(
      new Request("http://localhost/api/posts/post-1/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: "Looks great" }),
      }),
      { params: Promise.resolve({ postId: "post-1" }) },
    );

    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({});
  });
});
