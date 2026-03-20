import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth/session", () => ({
  requireAdminSession: vi.fn(),
}));

vi.mock("@/server/dal/post-revisions", () => ({
  countPostRevisions: vi.fn(),
  listPostRevisions: vi.fn(),
  postExistsById: vi.fn(),
}));

import { GET } from "@/app/api/admin/posts/[postId]/revisions/route";
import { requireAdminSession } from "@/lib/auth/session";
import { countPostRevisions, listPostRevisions, postExistsById } from "@/server/dal/post-revisions";

const MOCK_ADMIN_SESSION = {
  user: { id: "admin-1", email: "admin@example.com", name: "Admin" },
  expires: new Date(Date.now() + 1000 * 60 * 60).toISOString(),
};

const MOCK_REVISIONS = [
  {
    id: "rev-2",
    postId: "post-1",
    revisionNum: 2,
    title: "Updated Title",
    contentJson: '{"type":"doc","content":[]}',
    excerpt: "Updated excerpt",
    savedByUserId: "admin-1",
    savedAt: new Date("2026-03-19T10:00:00Z"),
    label: null,
  },
  {
    id: "rev-1",
    postId: "post-1",
    revisionNum: 1,
    title: "Original Title",
    contentJson: '{"type":"doc","content":[]}',
    excerpt: null,
    savedByUserId: "admin-1",
    savedAt: new Date("2026-03-18T09:00:00Z"),
    label: "Initial save",
  },
];

describe("GET /api/admin/posts/[postId]/revisions", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(requireAdminSession).mockResolvedValue(null);

    const response = await GET(new Request("http://localhost/api/admin/posts/post-1/revisions"), {
      params: Promise.resolve({ postId: "post-1" }),
    });

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "Unauthorized" });
  });

  it("returns 400 for invalid post id", async () => {
    vi.mocked(requireAdminSession).mockResolvedValue(MOCK_ADMIN_SESSION);

    const response = await GET(new Request("http://localhost/api/admin/posts//revisions"), {
      params: Promise.resolve({ postId: "" }),
    });

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "Invalid post id" });
  });

  it("returns 404 when post does not exist", async () => {
    vi.mocked(requireAdminSession).mockResolvedValue(MOCK_ADMIN_SESSION);
    vi.mocked(postExistsById).mockResolvedValue(false);

    const response = await GET(new Request("http://localhost/api/admin/posts/missing-post/revisions"), {
      params: Promise.resolve({ postId: "missing-post" }),
    });

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: "Post not found" });
  });

  it("returns paginated revisions for a valid post", async () => {
    vi.mocked(requireAdminSession).mockResolvedValue(MOCK_ADMIN_SESSION);
    vi.mocked(postExistsById).mockResolvedValue(true);
    vi.mocked(listPostRevisions).mockResolvedValue(MOCK_REVISIONS);
    vi.mocked(countPostRevisions).mockResolvedValue(2);

    const response = await GET(new Request("http://localhost/api/admin/posts/post-1/revisions"), {
      params: Promise.resolve({ postId: "post-1" }),
    });

    expect(response.status).toBe(200);
    const body = await response.json();

    expect(body.total).toBe(2);
    expect(body.page).toBe(1);
    expect(body.pageSize).toBe(20);
    expect(body.totalPages).toBe(1);
    expect(body.revisions).toHaveLength(2);

    expect(body.revisions[0]).toEqual({
      id: "rev-2",
      postId: "post-1",
      revisionNum: 2,
      title: "Updated Title",
      excerpt: "Updated excerpt",
      savedByUserId: "admin-1",
      savedAt: "2026-03-19T10:00:00.000Z",
      label: null,
    });

    expect(body.revisions[1]).toEqual({
      id: "rev-1",
      postId: "post-1",
      revisionNum: 1,
      title: "Original Title",
      excerpt: null,
      savedByUserId: "admin-1",
      savedAt: "2026-03-18T09:00:00.000Z",
      label: "Initial save",
    });
  });

  it("passes pagination params to the DAL", async () => {
    vi.mocked(requireAdminSession).mockResolvedValue(MOCK_ADMIN_SESSION);
    vi.mocked(postExistsById).mockResolvedValue(true);
    vi.mocked(listPostRevisions).mockResolvedValue([]);
    vi.mocked(countPostRevisions).mockResolvedValue(45);

    const response = await GET(
      new Request("http://localhost/api/admin/posts/post-1/revisions?page=3&pageSize=10"),
      { params: Promise.resolve({ postId: "post-1" }) },
    );

    expect(response.status).toBe(200);
    const body = await response.json();

    expect(vi.mocked(listPostRevisions)).toHaveBeenCalledWith("post-1", 10, 20); // offset = (3-1)*10 = 20
    expect(body.page).toBe(3);
    expect(body.pageSize).toBe(10);
    expect(body.totalPages).toBe(5); // ceil(45/10)
  });

  it("returns 400 for invalid pagination params", async () => {
    vi.mocked(requireAdminSession).mockResolvedValue(MOCK_ADMIN_SESSION);
    vi.mocked(postExistsById).mockResolvedValue(true);

    const response = await GET(
      new Request("http://localhost/api/admin/posts/post-1/revisions?pageSize=999"),
      { params: Promise.resolve({ postId: "post-1" }) },
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "Invalid pagination params" });
  });

  it("does not include contentJson in the response (bandwidth reduction)", async () => {
    vi.mocked(requireAdminSession).mockResolvedValue(MOCK_ADMIN_SESSION);
    vi.mocked(postExistsById).mockResolvedValue(true);
    vi.mocked(listPostRevisions).mockResolvedValue([MOCK_REVISIONS[0]]);
    vi.mocked(countPostRevisions).mockResolvedValue(1);

    const response = await GET(new Request("http://localhost/api/admin/posts/post-1/revisions"), {
      params: Promise.resolve({ postId: "post-1" }),
    });

    expect(response.status).toBe(200);
    const body = await response.json();

    // contentJson is large and not needed for listing; only fetch it per-revision
    expect(body.revisions[0]).not.toHaveProperty("contentJson");
  });
});
