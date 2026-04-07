import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { NextResponse } from "next/server";

vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: vi.fn(() => Promise.resolve({ allowed: true, limit: 10, remaining: 9, resetAt: Date.now() + 60_000 })),
  getClientIp: vi.fn(() => "127.0.0.1"),
  tooManyRequests: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/auth/session", () => ({
  requireAdminSession: vi.fn(),
}));

vi.mock("@/server/dal/post-revisions", () => ({
  getPostRevisionById: vi.fn(),
  restorePostRevisionAtomically: vi.fn(),
}));

vi.mock("@/server/posts/content", () => ({
  derivePostContent: vi.fn(),
}));

import { POST } from "@/app/api/admin/posts/[postId]/revisions/[revisionId]/restore/route";
import { requireAdminSession } from "@/lib/auth/session";
import { checkRateLimit } from "@/lib/rate-limit";
import {
  getPostRevisionById,
  restorePostRevisionAtomically,
} from "@/server/dal/post-revisions";
import { derivePostContent } from "@/server/posts/content";

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

const MOCK_CURRENT_SNAPSHOT = {
  title: "Current Title",
  slug: "current-title",
  contentJson: '{"type":"doc","content":[]}',
  excerpt: "current excerpt",
};

const MOCK_DERIVED = {
  canonicalContentJson: MOCK_REVISION.contentJson,
  contentFormat: "tiptap-json" as const,
  contentHtml: "<p>old content</p>",
  contentPlainText: "old content",
  excerpt: "old excerpt",
  imageAltWarnings: [],
};

function makeRequest(postId = "post-1", revisionId = "rev-3"): [Request, { params: Promise<{ postId: string; revisionId: string }> }] {
  return [
    new Request(`http://localhost/api/admin/posts/${postId}/revisions/${revisionId}/restore`, {
      method: "POST",
    }),
    { params: Promise.resolve({ postId, revisionId }) },
  ];
}

describe("POST /api/admin/posts/[postId]/revisions/[revisionId]/restore error handling", () => {
  beforeEach(() => {
    vi.mocked(checkRateLimit).mockResolvedValue({
      allowed: true,
      limit: 10,
      remaining: 9,
      resetAt: Date.now() + 60_000,
    });
    vi.mocked(requireAdminSession).mockResolvedValue(MOCK_ADMIN_SESSION);
    vi.mocked(getPostRevisionById).mockResolvedValue(MOCK_REVISION);
    vi.mocked(derivePostContent).mockReturnValue(MOCK_DERIVED);
    vi.mocked(restorePostRevisionAtomically).mockResolvedValue({
      newRevisionId: "rev-pre-restore",
      slug: "current-title",
    });
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it("returns 400 for whitespace-only params", async () => {
    vi.mocked(requireAdminSession).mockResolvedValue(MOCK_ADMIN_SESSION);

    const [req, ctx] = makeRequest("   ", "   ");
    const response = await POST(req, ctx);

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "Invalid params" });
  });

  it("returns 404 when the post disappears before the atomic restore commits", async () => {
    vi.mocked(requireAdminSession).mockResolvedValue(MOCK_ADMIN_SESSION);
    vi.mocked(getPostRevisionById).mockResolvedValue(MOCK_REVISION);
    vi.mocked(derivePostContent).mockReturnValue(MOCK_DERIVED);
    vi.mocked(restorePostRevisionAtomically).mockResolvedValue(null);

    const [req, ctx] = makeRequest();
    const response = await POST(req, ctx);

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: "Post not found" });
  });

  it("returns 500 when the atomic restore transaction fails unexpectedly", async () => {
    vi.mocked(requireAdminSession).mockResolvedValue(MOCK_ADMIN_SESSION);
    vi.mocked(getPostRevisionById).mockResolvedValue(MOCK_REVISION);
    vi.mocked(derivePostContent).mockReturnValue(MOCK_DERIVED);
    vi.mocked(restorePostRevisionAtomically).mockRejectedValue(new Error("DB write failed"));

    const [req, ctx] = makeRequest();
    const response = await POST(req, ctx);

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: "Failed to restore revision" });
  });
});
