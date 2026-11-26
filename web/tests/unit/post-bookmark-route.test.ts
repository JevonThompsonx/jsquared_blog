import { afterEach, describe, expect, it, vi } from "vitest";
import { NextResponse } from "next/server";

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

vi.mock("@/server/auth/public-users", () => ({
  getRequestPublicUser: vi.fn(),
}));

vi.mock("@/server/dal/bookmarks", () => ({
  isPostBookmarked: vi.fn(),
  togglePostBookmark: vi.fn(),
}));

import { GET, POST } from "@/app/api/posts/[postId]/bookmark/route";
import { getRequestPublicUser } from "@/server/auth/public-users";
import { checkRateLimit, tooManyRequests } from "@/lib/rate-limit";
import { captureException } from "@/lib/sentry";
import { isPostBookmarked, togglePostBookmark } from "@/server/dal/bookmarks";

function makePublicUser(id = "reader-1") {
  return {
    id,
    email: "reader@example.com",
    displayName: "Reader",
    avatarUrl: null,
  };
}

describe("GET /api/posts/[postId]/bookmark", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns 400 for invalid post id", async () => {
    const response = await GET(
      new Request("http://localhost/api/posts/invalid id/bookmark"),
      {
        params: Promise.resolve({ postId: "invalid id" }),
      },
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "Invalid post ID" });
  });

  it("returns bookmarked false when unauthenticated", async () => {
    vi.mocked(getRequestPublicUser).mockResolvedValue(null);

    const response = await GET(
      new Request("http://localhost/api/posts/post-1/bookmark"),
      {
        params: Promise.resolve({ postId: "post-1" }),
      },
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ bookmarked: false });
    expect(vi.mocked(checkRateLimit)).not.toHaveBeenCalled();
  });

  it("returns throttled response for authenticated users when rate limited", async () => {
    vi.mocked(getRequestPublicUser).mockResolvedValue(makePublicUser());
    vi.mocked(checkRateLimit).mockResolvedValue({
      allowed: false,
      limit: 60,
      remaining: 0,
      resetAt: Date.now() + 60_000,
    });
    const throttled = NextResponse.json(
      { error: "Too many requests" },
      { status: 429 },
    );
    vi.mocked(tooManyRequests).mockReturnValue(throttled);

    const response = await GET(
      new Request("http://localhost/api/posts/post-1/bookmark"),
      {
        params: Promise.resolve({ postId: "post-1" }),
      },
    );

    expect(response).toBe(throttled);
    expect(vi.mocked(isPostBookmarked)).not.toHaveBeenCalled();
  });

  it("returns bookmark status for authenticated users", async () => {
    vi.mocked(getRequestPublicUser).mockResolvedValue(makePublicUser());
    vi.mocked(checkRateLimit).mockResolvedValue({
      allowed: true,
      limit: 60,
      remaining: 59,
      resetAt: Date.now() + 60_000,
    });
    vi.mocked(isPostBookmarked).mockResolvedValue(true);

    const response = await GET(
      new Request("http://localhost/api/posts/post-1/bookmark"),
      {
        params: Promise.resolve({ postId: "post-1" }),
      },
    );

    expect(response.status).toBe(200);
    expect(vi.mocked(checkRateLimit)).toHaveBeenCalledWith(
      "bookmark-status:reader-1:127.0.0.1",
      60,
      60_000,
    );
    expect(await response.json()).toEqual({ bookmarked: true });
  });

  it("returns a safe generic error when bookmark status lookup fails unexpectedly", async () => {
    vi.mocked(getRequestPublicUser).mockResolvedValue(makePublicUser());
    vi.mocked(checkRateLimit).mockResolvedValue({
      allowed: true,
      limit: 60,
      remaining: 59,
      resetAt: Date.now() + 60_000,
    });
    const dbError = new Error("bookmark status lookup failed");
    vi.mocked(isPostBookmarked).mockRejectedValue(dbError);

    const response = await GET(
      new Request("http://localhost/api/posts/post-1/bookmark"),
      {
        params: Promise.resolve({ postId: "post-1" }),
      },
    );

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: "Internal error" });
    expect(vi.mocked(captureException)).toHaveBeenCalledWith(
      dbError,
      expect.objectContaining({ route: "post-bookmark", postId: "post-1" }),
    );
  });
});

describe("POST /api/posts/[postId]/bookmark", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns 400 for invalid post id", async () => {
    const response = await POST(
      new Request("http://localhost/api/posts/invalid id/bookmark", {
        method: "POST",
      }),
      {
        params: Promise.resolve({ postId: "invalid id" }),
      },
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "Invalid post ID" });
  });

  it("returns 401 when unauthenticated", async () => {
    vi.mocked(checkRateLimit).mockResolvedValue({
      allowed: true,
      limit: 20,
      remaining: 19,
      resetAt: Date.now() + 60_000,
    });
    vi.mocked(getRequestPublicUser).mockResolvedValue(null);

    const response = await POST(
      new Request("http://localhost/api/posts/post-1/bookmark", {
        method: "POST",
      }),
      {
        params: Promise.resolve({ postId: "post-1" }),
      },
    );

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "Unauthorized" });
    expect(vi.mocked(togglePostBookmark)).not.toHaveBeenCalled();
  });

  it("scopes authenticated bookmark throttling to the user id and client IP", async () => {
    vi.mocked(getRequestPublicUser).mockResolvedValue(makePublicUser());
    vi.mocked(checkRateLimit).mockResolvedValue({
      allowed: true,
      limit: 20,
      remaining: 19,
      resetAt: Date.now() + 60_000,
    });
    vi.mocked(togglePostBookmark).mockResolvedValue({ bookmarked: true });

    const response = await POST(
      new Request("http://localhost/api/posts/post-1/bookmark", {
        method: "POST",
      }),
      {
        params: Promise.resolve({ postId: "post-1" }),
      },
    );

    expect(response.status).toBe(201);
    expect(vi.mocked(checkRateLimit)).toHaveBeenCalledWith(
      "bookmark:reader-1:127.0.0.1",
      20,
      60_000,
    );
  });

  it("returns the throttled response when rate limited", async () => {
    vi.mocked(getRequestPublicUser).mockResolvedValue(makePublicUser());
    vi.mocked(checkRateLimit).mockResolvedValue({
      allowed: false,
      limit: 20,
      remaining: 0,
      resetAt: Date.now() + 60_000,
    });
    const throttled = NextResponse.json(
      { error: "Too many requests" },
      { status: 429 },
    );
    vi.mocked(tooManyRequests).mockReturnValue(throttled);

    const response = await POST(
      new Request("http://localhost/api/posts/post-1/bookmark", {
        method: "POST",
      }),
      {
        params: Promise.resolve({ postId: "post-1" }),
      },
    );

    expect(response).toBe(throttled);
    expect(vi.mocked(togglePostBookmark)).not.toHaveBeenCalled();
  });

  it("returns 201 when creating a bookmark", async () => {
    vi.mocked(getRequestPublicUser).mockResolvedValue(makePublicUser());
    vi.mocked(checkRateLimit).mockResolvedValue({
      allowed: true,
      limit: 20,
      remaining: 19,
      resetAt: Date.now() + 60_000,
    });
    vi.mocked(togglePostBookmark).mockResolvedValue({ bookmarked: true });

    const response = await POST(
      new Request("http://localhost/api/posts/post-1/bookmark", {
        method: "POST",
      }),
      {
        params: Promise.resolve({ postId: "post-1" }),
      },
    );

    expect(response.status).toBe(201);
    expect(vi.mocked(togglePostBookmark)).toHaveBeenCalledWith(
      "post-1",
      "reader-1",
    );
    expect(await response.json()).toEqual({ bookmarked: true });
  });

  it("returns 200 when removing a bookmark", async () => {
    vi.mocked(getRequestPublicUser).mockResolvedValue(makePublicUser());
    vi.mocked(checkRateLimit).mockResolvedValue({
      allowed: true,
      limit: 20,
      remaining: 19,
      resetAt: Date.now() + 60_000,
    });
    vi.mocked(togglePostBookmark).mockResolvedValue({ bookmarked: false });

    const response = await POST(
      new Request("http://localhost/api/posts/post-1/bookmark", {
        method: "POST",
      }),
      {
        params: Promise.resolve({ postId: "post-1" }),
      },
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ bookmarked: false });
  });

  it("returns a safe generic error when bookmark mutation fails unexpectedly", async () => {
    vi.mocked(getRequestPublicUser).mockResolvedValue(makePublicUser());
    vi.mocked(checkRateLimit).mockResolvedValue({
      allowed: true,
      limit: 20,
      remaining: 19,
      resetAt: Date.now() + 60_000,
    });
    const dbError = new Error("bookmark toggle failed");
    vi.mocked(togglePostBookmark).mockRejectedValue(dbError);

    const response = await POST(
      new Request("http://localhost/api/posts/post-1/bookmark", {
        method: "POST",
      }),
      {
        params: Promise.resolve({ postId: "post-1" }),
      },
    );

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: "Internal error" });
    expect(vi.mocked(captureException)).toHaveBeenCalledWith(
      dbError,
      expect.objectContaining({ route: "post-bookmark", postId: "post-1" }),
    );
  });
});
