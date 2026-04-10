import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/components/admin/admin-dashboard", () => ({
  AdminDashboard: () => <div data-testid="admin-dashboard">Dashboard</div>,
}));

vi.mock("@/components/admin/post-editor-form", () => ({
  PostEditorForm: vi.fn(() => <div data-testid="post-editor-form">Editor</div>),
}));

vi.mock("@/components/auth/admin-auth-button", () => ({
  AdminAuthButton: () => <button type="button">Admin sign in</button>,
}));

vi.mock("@/components/layout/site-header", () => ({
  SiteHeader: () => null,
}));

vi.mock("@/app/admin/actions", () => ({
  updateAdminPostAction: vi.fn(),
}));

vi.mock("@/lib/auth/admin", () => ({
  isAdminAuthConfigured: vi.fn(() => true),
}));

vi.mock("@/lib/auth/session", () => ({
  requireAdminSession: vi.fn(),
}));

vi.mock("@/server/dal/admin-posts", () => ({
  getAdminEditablePostById: vi.fn(),
  listAllAdminTags: vi.fn(async () => []),
}));

vi.mock("@/server/dal/series", () => ({
  listAllSeries: vi.fn(async () => []),
}));

vi.mock("@/server/forms/admin-post-list", () => ({
  parseAdminPostListSearchParams: vi.fn(() => ({
    query: "",
    page: 1,
    pageSize: 24,
    sort: "updated-desc",
  })),
}));

vi.mock("@/server/queries/admin-dashboard", () => ({
  getAdminDashboardData: vi.fn(async () => ({
    counts: { total: 0, published: 0, draft: 0, scheduled: 0 },
    posts: {
      posts: [],
      totalCount: 0,
      page: 1,
      pageSize: 24,
      totalPages: 1,
      filters: {
        query: "",
        page: 1,
        pageSize: 24,
        sort: "updated-desc",
      },
    },
  })),
  getAdminDashboardMetadata: vi.fn(async () => ({ categories: [] })),
}));

import AdminPage from "@/app/admin/page";
import { updateAdminPostAction } from "@/app/admin/actions";
import { PostEditorForm } from "@/components/admin/post-editor-form";
import { isAdminAuthConfigured } from "@/lib/auth/admin";
import { requireAdminSession } from "@/lib/auth/session";
import { getAdminEditablePostById, listAllAdminTags } from "@/server/dal/admin-posts";
import { listAllSeries } from "@/server/dal/series";
import { parseAdminPostListSearchParams } from "@/server/forms/admin-post-list";
import { getAdminDashboardData, getAdminDashboardMetadata } from "@/server/queries/admin-dashboard";

describe("AdminPage", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("renders admin quick links for admin sessions", async () => {
    vi.mocked(requireAdminSession).mockResolvedValue({
      user: {
        id: "admin-1",
        role: "admin",
        githubLogin: "octoadmin",
      },
    } as never);

    const markup = renderToStaticMarkup(await AdminPage({}));

    expect(markup).toContain("Admin pages");
    expect(markup).toContain("href=\"/admin/wishlist\"");
    expect(markup).toContain("href=\"/admin/tags\"");
    expect(markup).toContain("href=\"/admin/posts/new\"");
    expect(markup).toContain("Travel wishlist");
    expect(getAdminDashboardData).toHaveBeenCalled();
    expect(getAdminDashboardMetadata).toHaveBeenCalled();
  });

  it("keeps admin quick links hidden when there is no admin session", async () => {
    vi.mocked(requireAdminSession).mockResolvedValue(null);

    const markup = renderToStaticMarkup(await AdminPage({}));

    expect(markup).not.toContain("Admin pages");
    expect(markup).not.toContain("href=\"/admin/wishlist\"");
    expect(getAdminDashboardData).not.toHaveBeenCalled();
    expect(getAdminDashboardMetadata).not.toHaveBeenCalled();
  });

  it("shows the auth-disabled message when admin auth is unavailable", async () => {
    vi.mocked(requireAdminSession).mockResolvedValue(null);
    vi.mocked(isAdminAuthConfigured).mockReturnValue(false);

    const markup = renderToStaticMarkup(await AdminPage({}));

    expect(markup).toContain("Admin sign-in is not available right now.");
    expect(markup).not.toContain("Admin pages");
  });

  it("shows denied sign-in feedback from the query string", async () => {
    vi.mocked(requireAdminSession).mockResolvedValue(null);

    const markup = renderToStaticMarkup(await AdminPage({
      searchParams: Promise.resolve({ error: "AccessDenied" }),
    }));

    expect(markup).toContain("Sign-in was denied.");
  });

  it("shows retired-route and post workflow feedback from the query string", async () => {
    vi.mocked(requireAdminSession).mockResolvedValue({
      user: {
        id: "admin-1",
        role: "admin",
        githubLogin: "octoadmin",
      },
    } as never);

    const markup = renderToStaticMarkup(await AdminPage({
      searchParams: Promise.resolve({ saved: "1", cloned: "1", editRemoved: "1" }),
    }));

    expect(markup).toContain("Post saved successfully.");
    expect(markup).toContain("Draft clone created successfully.");
    expect(markup).toContain("The legacy post edit route has moved into the admin dashboard.");
  });

  it("renders the inline editor when a valid postId is provided", async () => {
    vi.mocked(requireAdminSession).mockResolvedValue({
      user: {
        id: "admin-1",
        role: "admin",
        githubLogin: "octoadmin",
      },
    } as never);
    vi.mocked(getAdminEditablePostById).mockResolvedValue({
      id: "post-123",
      slug: "admin-fixture",
      title: "Admin fixture",
      status: "draft",
      excerpt: "Fixture excerpt",
      category: "Travel",
      categoryId: "cat-1",
      imageUrl: null,
      createdAt: new Date("2026-04-01T00:00:00.000Z"),
      updatedAt: new Date("2026-04-01T00:00:00.000Z"),
      publishedAt: null,
      scheduledPublishTime: null,
      viewCount: 0,
      layoutType: "standard",
      contentJson: '{"type":"doc","content":[]}',
      contentFormat: "tiptap-json",
      contentHtml: null,
      contentPlainText: null,
      featuredImageAlt: null,
      seriesId: null,
      seriesTitle: null,
      seriesOrder: null,
      locationName: null,
      locationLat: null,
      locationLng: null,
      locationZoom: null,
      iovanderUrl: null,
      songTitle: null,
      songArtist: null,
      songUrl: null,
      tags: [],
      galleryImages: [],
    } as never);
    vi.mocked(listAllSeries).mockResolvedValue([{ id: "series-1", title: "Summer", slug: "summer", description: null }] as never);
    vi.mocked(listAllAdminTags).mockResolvedValue([{ id: "tag-1", name: "Road trip", slug: "road-trip" }] as never);

    const markup = renderToStaticMarkup(await AdminPage({
      searchParams: Promise.resolve({ postId: " post-123 " }),
    }));

    expect(markup).toContain("Edit post");
    expect(markup).toContain("Close editor");
    expect(getAdminEditablePostById).toHaveBeenCalledWith("post-123");
    expect(listAllSeries).toHaveBeenCalled();
    expect(listAllAdminTags).toHaveBeenCalled();
    expect(PostEditorForm).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: "edit",
        post: expect.objectContaining({ id: "post-123" }),
        allSeries: [{ id: "series-1", title: "Summer", slug: "summer", description: null }],
        allTags: [{ id: "tag-1", name: "Road trip", slug: "road-trip" }],
        returnTo: "/admin",
      }),
      undefined,
    );

    const [[props]] = vi.mocked(PostEditorForm).mock.calls;
    await props.action(new FormData());

    expect(updateAdminPostAction).toHaveBeenCalledWith("post-123", expect.any(FormData));
  });

  it("preserves dashboard filters in the inline editor close/save path", async () => {
    vi.mocked(requireAdminSession).mockResolvedValue({
      user: {
        id: "admin-1",
        role: "admin",
        githubLogin: "octoadmin",
      },
    } as never);
    vi.mocked(getAdminEditablePostById).mockResolvedValue({
      id: "post-123",
      slug: "admin-fixture",
      title: "Admin fixture",
      status: "draft",
      excerpt: "Fixture excerpt",
      category: "Travel",
      categoryId: "cat-1",
      imageUrl: null,
      createdAt: new Date("2026-04-01T00:00:00.000Z"),
      updatedAt: new Date("2026-04-01T00:00:00.000Z"),
      publishedAt: null,
      scheduledPublishTime: null,
      viewCount: 0,
      layoutType: "standard",
      contentJson: '{"type":"doc","content":[]}',
      contentFormat: "tiptap-json",
      contentHtml: null,
      contentPlainText: null,
      featuredImageAlt: null,
      seriesId: null,
      seriesTitle: null,
      seriesOrder: null,
      locationName: null,
      locationLat: null,
      locationLng: null,
      locationZoom: null,
      iovanderUrl: null,
      songTitle: null,
      songArtist: null,
      songUrl: null,
      tags: [],
      galleryImages: [],
    } as never);

    const markup = renderToStaticMarkup(await AdminPage({
      searchParams: Promise.resolve({ postId: "post-123", status: "published", page: "2", search: "coast" }),
    }));

    expect(markup).toContain('href="/admin?status=published&amp;page=2&amp;search=coast"');
    expect(PostEditorForm).toHaveBeenCalledWith(
      expect.objectContaining({
        returnTo: "/admin?status=published&page=2&search=coast",
      }),
      undefined,
    );
  });

  it("does not parse admin dashboard filters for public visitors", async () => {
    vi.mocked(requireAdminSession).mockResolvedValue(null);

    await AdminPage({
      searchParams: Promise.resolve({ status: "not-a-real-status" }),
    });

    expect(parseAdminPostListSearchParams).not.toHaveBeenCalled();
    expect(getAdminDashboardData).not.toHaveBeenCalled();
    expect(getAdminDashboardMetadata).not.toHaveBeenCalled();
  });
});
