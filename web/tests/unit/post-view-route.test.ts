import { afterEach, describe, expect, it, vi } from "vitest";
import { NextResponse } from "next/server";

const { cookiesMock } = vi.hoisted(() => ({
  cookiesMock: vi.fn(),
}));

vi.mock("next/headers", () => ({
  cookies: cookiesMock,
}));

vi.mock("@/server/dal/posts", () => ({
  incrementPostViewCount: vi.fn(),
}));

vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: vi.fn(),
  tooManyRequests: vi.fn(() => NextResponse.json({ error: "Too many requests" }, { status: 429 })),
}));

import { POST } from "@/app/api/posts/[postId]/view/route";
import { checkRateLimit, tooManyRequests } from "@/lib/rate-limit";
import { incrementPostViewCount } from "@/server/dal/posts";

type CookieEntry = { value: string };

function makeCookieStore(initialValues: Record<string, string> = {}) {
  const values = new Map(Object.entries(initialValues));
  const set = vi.fn((name: string, value: string) => {
    values.set(name, value);
  });

  return {
    get(name: string): CookieEntry | undefined {
      const value = values.get(name);
      return value === undefined ? undefined : { value };
    },
    set,
  };
}

describe("POST /api/posts/[postId]/view", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("rejects invalid post ids", async () => {
    const response = await POST(new Request("http://localhost/api/posts/test/view", { method: "POST" }), {
      params: Promise.resolve({ postId: "" }),
    });

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "Invalid post id" });
  });

  it("does not increment when the post was already viewed this session", async () => {
    const cookieStore = makeCookieStore({
      "j2-viewed-post-post-1": "1",
    });
    cookiesMock.mockResolvedValue(cookieStore);

    const response = await POST(new Request("http://localhost/api/posts/post-1/view", { method: "POST" }), {
      params: Promise.resolve({ postId: "post-1" }),
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ counted: false });
    expect(vi.mocked(incrementPostViewCount)).not.toHaveBeenCalled();
    expect(cookieStore.set).toHaveBeenCalledWith(
      "j2-viewer-id",
      expect.any(String),
      expect.objectContaining({ httpOnly: true, sameSite: "lax", path: "/" }),
    );
  });

  it("returns the throttled response when rate limited", async () => {
    const cookieStore = makeCookieStore({
      "j2-viewer-id": "viewer-123",
    });
    const throttledResponse = NextResponse.json({ error: "Too many requests" }, { status: 429 });

    cookiesMock.mockResolvedValue(cookieStore);
    vi.mocked(checkRateLimit).mockResolvedValue({ allowed: false, limit: 20, remaining: 0, resetAt: Date.now() + 60_000 });
    vi.mocked(tooManyRequests).mockReturnValue(throttledResponse);

    const response = await POST(new Request("http://localhost/api/posts/post-1/view", { method: "POST" }), {
      params: Promise.resolve({ postId: "post-1" }),
    });

    expect(response).toBe(throttledResponse);
    expect(vi.mocked(incrementPostViewCount)).not.toHaveBeenCalled();
  });

  it("increments once and sets both tracking cookies for a fresh session", async () => {
    const cookieStore = makeCookieStore({
      "j2-viewer-id": "viewer-123",
    });

    cookiesMock.mockResolvedValue(cookieStore);
    vi.mocked(checkRateLimit).mockResolvedValue({ allowed: true, limit: 20, remaining: 19, resetAt: Date.now() + 60_000 });

    const response = await POST(new Request("http://localhost/api/posts/post-1/view", { method: "POST" }), {
      params: Promise.resolve({ postId: "post-1" }),
    });

    expect(response.status).toBe(202);
    expect(await response.json()).toEqual({ counted: true });
    expect(vi.mocked(checkRateLimit)).toHaveBeenCalledWith("post-view:post-1:viewer-123", 20, 60_000);
    expect(vi.mocked(incrementPostViewCount)).toHaveBeenCalledWith("post-1");
    expect(cookieStore.set).toHaveBeenCalledWith(
      "j2-viewed-post-post-1",
      "1",
      expect.objectContaining({ httpOnly: true, sameSite: "lax", path: "/" }),
    );
  });
});
