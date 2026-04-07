import { NextResponse } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: vi.fn(() => Promise.resolve({ allowed: true, limit: 120, remaining: 119, resetAt: Date.now() + 60_000 })),
  getClientIp: vi.fn(() => "127.0.0.1"),
  tooManyRequests: vi.fn(() => NextResponse.json({ error: "Too many requests" }, { status: 429 })),
}));

vi.mock("@/lib/auth/session", () => ({
  requireAdminSession: vi.fn(),
}));

vi.mock("@/server/dal/post-revisions", () => ({
  getPostRevisionById: vi.fn(),
}));

import { GET } from "@/app/api/admin/posts/[postId]/revisions/[revisionId]/route";
import { requireAdminSession } from "@/lib/auth/session";
import { checkRateLimit, tooManyRequests } from "@/lib/rate-limit";
import { getPostRevisionById } from "@/server/dal/post-revisions";

const MOCK_ADMIN_SESSION = {
  user: { id: "admin-1", email: "admin@example.com", name: "Admin" },
  expires: new Date(Date.now() + 1000 * 60 * 60).toISOString(),
};

const MOCK_REVISION = {
  id: "rev-3",
  postId: "post-1",
  revisionNum: 3,
  title: "Historical Title",
  contentJson: '{"type":"doc","content":[]}',
  excerpt: "old excerpt",
  savedByUserId: "admin-1",
  savedAt: new Date("2026-03-15T10:00:00Z"),
  label: null,
};

function makeContext(postId = "post-1", revisionId = "rev-3"): { params: Promise<{ postId: string; revisionId: string }> } {
  return { params: Promise.resolve({ postId, revisionId }) };
}

describe("GET /api/admin/posts/[postId]/revisions/[revisionId]", () => {
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

    const response = await GET(new Request("http://localhost/api/admin/posts/post-1/revisions/rev-3"), makeContext());

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "Unauthorized" });
  });

  it("returns the throttled response when rate limited", async () => {
    vi.mocked(requireAdminSession).mockResolvedValue(MOCK_ADMIN_SESSION);
    vi.mocked(checkRateLimit).mockResolvedValue({ allowed: false, limit: 120, remaining: 0, resetAt: Date.now() + 60_000 });
    const throttled = NextResponse.json({ error: "Too many requests" }, { status: 429 });
    vi.mocked(tooManyRequests).mockReturnValue(throttled);

    const response = await GET(new Request("http://localhost/api/admin/posts/post-1/revisions/rev-3"), makeContext());

    expect(response).toBe(throttled);
    expect(vi.mocked(getPostRevisionById)).not.toHaveBeenCalled();
  });

  it("returns 400 for whitespace-only params", async () => {
    vi.mocked(requireAdminSession).mockResolvedValue(MOCK_ADMIN_SESSION);

    const response = await GET(
      new Request("http://localhost/api/admin/posts/%20%20%20/revisions/%20%20%20"),
      makeContext("   ", "   "),
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "Invalid params" });
  });

  it("returns 404 when the revision is missing", async () => {
    vi.mocked(requireAdminSession).mockResolvedValue(MOCK_ADMIN_SESSION);
    vi.mocked(getPostRevisionById).mockResolvedValue(null);

    const response = await GET(new Request("http://localhost/api/admin/posts/post-1/revisions/rev-missing"), makeContext("post-1", "rev-missing"));

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: "Revision not found" });
  });

  it("returns 500 for unexpected revision lookup failures", async () => {
    vi.mocked(requireAdminSession).mockResolvedValue(MOCK_ADMIN_SESSION);
    vi.mocked(getPostRevisionById).mockRejectedValue(new Error("database offline"));

    const response = await GET(new Request("http://localhost/api/admin/posts/post-1/revisions/rev-3"), makeContext());

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: "Failed to load revision" });
  });

  it("returns the revision detail for valid requests", async () => {
    vi.mocked(requireAdminSession).mockResolvedValue(MOCK_ADMIN_SESSION);
    vi.mocked(getPostRevisionById).mockResolvedValue(MOCK_REVISION);

    const response = await GET(new Request("http://localhost/api/admin/posts/post-1/revisions/rev-3"), makeContext());

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      id: "rev-3",
      postId: "post-1",
      revisionNum: 3,
      title: "Historical Title",
      excerpt: "old excerpt",
      contentJson: '{"type":"doc","content":[]}',
      savedByUserId: "admin-1",
      savedAt: "2026-03-15T10:00:00.000Z",
      label: null,
    });
  });
});
