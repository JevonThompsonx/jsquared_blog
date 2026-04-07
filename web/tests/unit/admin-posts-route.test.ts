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

vi.mock("@/server/dal/admin-posts", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/server/dal/admin-posts")>();

  return {
    ...actual,
    listAdminPostRecords: vi.fn(),
  };
});

import { GET } from "@/app/api/admin/posts/route";
import { requireAdminSession } from "@/lib/auth/session";
import { checkRateLimit, tooManyRequests } from "@/lib/rate-limit";
import { listAdminPostRecords } from "@/server/dal/admin-posts";
import * as adminPostListForm from "@/server/forms/admin-post-list";

function makeAdminSession(): AdminSession {
  return {
    expires: "2099-01-01T00:00:00.000Z",
    user: {
      id: "admin-1",
      role: "admin",
    },
  };
}

describe("GET /api/admin/posts", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("rejects unauthenticated requests", async () => {
    vi.mocked(requireAdminSession).mockResolvedValue(null);

    const response = await GET(new Request("http://localhost/api/admin/posts"));

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "Unauthorized" });
  });

  it("returns the throttled response when rate limited", async () => {
    vi.mocked(requireAdminSession).mockResolvedValue(makeAdminSession());
    vi.mocked(checkRateLimit).mockResolvedValue({
      allowed: false,
      limit: 120,
      remaining: 0,
      resetAt: Date.now() + 60_000,
    });
    const throttled = NextResponse.json({ error: "Too many requests" }, { status: 429 });
    vi.mocked(tooManyRequests).mockReturnValue(throttled);

    const response = await GET(new Request("http://localhost/api/admin/posts"));

    expect(response).toBe(throttled);
    expect(vi.mocked(listAdminPostRecords)).not.toHaveBeenCalled();
  });

  it("returns 400 for invalid status query params", async () => {
    vi.mocked(requireAdminSession).mockResolvedValue(makeAdminSession());
    vi.mocked(checkRateLimit).mockResolvedValue({
      allowed: true,
      limit: 120,
      remaining: 119,
      resetAt: Date.now() + 60_000,
    });

    const response = await GET(new Request("http://localhost/api/admin/posts?status=not-real"));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "Invalid query parameters" });
    expect(vi.mocked(listAdminPostRecords)).not.toHaveBeenCalled();
  });

  it("returns 400 for invalid pagination query params", async () => {
    vi.mocked(requireAdminSession).mockResolvedValue(makeAdminSession());
    vi.mocked(checkRateLimit).mockResolvedValue({
      allowed: true,
      limit: 120,
      remaining: 119,
      resetAt: Date.now() + 60_000,
    });

    const response = await GET(new Request("http://localhost/api/admin/posts?page=0"));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "Invalid query parameters" });
    expect(vi.mocked(listAdminPostRecords)).not.toHaveBeenCalled();
  });

  it("returns 400 for oversized search input", async () => {
    vi.mocked(requireAdminSession).mockResolvedValue(makeAdminSession());
    vi.mocked(checkRateLimit).mockResolvedValue({
      allowed: true,
      limit: 120,
      remaining: 119,
      resetAt: Date.now() + 60_000,
    });

    const oversizedQuery = "a".repeat(121);
    const response = await GET(new Request(`http://localhost/api/admin/posts?query=${oversizedQuery}`));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "Invalid query parameters" });
    expect(vi.mocked(listAdminPostRecords)).not.toHaveBeenCalled();
  });

  it("returns list results for valid params", async () => {
    vi.mocked(requireAdminSession).mockResolvedValue(makeAdminSession());
    vi.mocked(checkRateLimit).mockResolvedValue({
      allowed: true,
      limit: 120,
      remaining: 119,
      resetAt: Date.now() + 60_000,
    });
    vi.mocked(listAdminPostRecords).mockResolvedValue({
      posts: [],
      totalCount: 0,
      page: 2,
      pageSize: 10,
      totalPages: 1,
      filters: {
        query: "trip",
        category: undefined,
        status: undefined,
        page: 2,
        pageSize: 10,
        sort: "updated-desc",
      },
    });

    const response = await GET(new Request("http://localhost/api/admin/posts?search=trip&page=2&pageSize=10&sort=newest"));

    expect(response.status).toBe(200);
    expect(vi.mocked(listAdminPostRecords)).toHaveBeenCalledWith({
      query: "trip",
      category: undefined,
      status: undefined,
      page: 2,
      pageSize: 10,
      sort: "created-desc",
    });
    expect(await response.json()).toEqual({
      posts: [],
      totalCount: 0,
      page: 2,
      pageSize: 10,
      totalPages: 1,
      filters: {
        query: "trip",
        page: 2,
        pageSize: 10,
        sort: "updated-desc",
      },
    });
  });

  it("returns a safe 500 for unexpected query parsing failures", async () => {
    vi.mocked(requireAdminSession).mockResolvedValue(makeAdminSession());
    vi.mocked(checkRateLimit).mockResolvedValue({
      allowed: true,
      limit: 120,
      remaining: 119,
      resetAt: Date.now() + 60_000,
    });
    const parseSpy = vi.spyOn(adminPostListForm, "parseAdminPostListSearchParams").mockImplementation(() => {
      throw new Error("unexpected parse failure");
    });

    const response = await GET(new Request("http://localhost/api/admin/posts?search=trip"));

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: "Failed to load posts" });

    parseSpy.mockRestore();
  });

  it("returns a safe 500 for unexpected list failures", async () => {
    vi.mocked(requireAdminSession).mockResolvedValue(makeAdminSession());
    vi.mocked(checkRateLimit).mockResolvedValue({
      allowed: true,
      limit: 120,
      remaining: 119,
      resetAt: Date.now() + 60_000,
    });
    vi.mocked(listAdminPostRecords).mockRejectedValue(new Error("database offline"));

    const response = await GET(new Request("http://localhost/api/admin/posts?search=trip"));

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: "Failed to load posts" });
  });
});
