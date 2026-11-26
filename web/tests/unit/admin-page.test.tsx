import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { cookiesMock } = vi.hoisted(() => ({
  cookiesMock: vi.fn(),
}));

vi.mock("next/headers", () => ({
  cookies: cookiesMock,
}));

vi.mock("@/components/admin/admin-dashboard", () => ({
  AdminDashboard: () => <div data-testid="admin-dashboard">Dashboard</div>,
}));

vi.mock("@/components/admin/post-editor-form", () => ({
  PostEditorForm: vi.fn(() => <div data-testid="post-editor-form">Editor</div>),
}));

vi.mock("@/components/layout/site-header", () => ({
  SiteHeader: () => null,
}));

vi.mock("@/app/admin/actions", () => ({
  updateAdminPostAction: vi.fn(),
}));

vi.mock("@/lib/auth/session", () => ({
  getAdminAccessState: vi.fn(),
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
import { getAdminAccessState } from "@/lib/auth/session";
import {
  getAdminEditablePostById,
  listAllAdminTags,
} from "@/server/dal/admin-posts";
import { listAllSeries } from "@/server/dal/series";
import { parseAdminPostListSearchParams } from "@/server/forms/admin-post-list";
import {
  getAdminDashboardData,
  getAdminDashboardMetadata,
} from "@/server/queries/admin-dashboard";

function makeCookieStore(initialValues: Record<string, string> = {}) {
  const values = new Map(Object.entries(initialValues));

  return {
    get(name: string) {
      const value = values.get(name);
      return value === undefined ? undefined : { value };
    },
  };
}

describe("AdminPage", () => {
  beforeEach(() => {
    vi.mocked(getAdminAccessState).mockResolvedValue({
      session: null,
      stale: false,
      viewer: null,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
    cookiesMock.mockReset();
  });

  it("renders admin quick links for admin sessions", async () => {
    vi.mocked(getAdminAccessState).mockResolvedValue({
      session: {
        user: {
          id: "admin-1",
          role: "admin",
        },
      } as never,
      stale: false,
      viewer: null,
    });
    cookiesMock.mockResolvedValue(makeCookieStore());

    const markup = renderToStaticMarkup(await AdminPage({}));

    expect(markup).toContain("Admin pages");
    expect(markup).toContain('href="/admin/wishlist"');
    expect(markup).toContain('href="/admin/tags"');
    expect(markup).toContain('href="/admin/posts/new"');
    expect(markup).toContain("Travel wishlist");
    expect(markup).toContain('href="/api/auth/logout?returnTo=%2Fadmin"');
    expect(markup).not.toContain("switch account");
    expect(getAdminDashboardData).toHaveBeenCalled();
    expect(getAdminDashboardMetadata).toHaveBeenCalled();
  });

  it("keeps admin quick links hidden when there is no admin session", async () => {
    vi.mocked(getAdminAccessState).mockResolvedValue({
      session: null,
      stale: false,
      viewer: null,
    });
    cookiesMock.mockResolvedValue(makeCookieStore());

    const markup = renderToStaticMarkup(await AdminPage({}));

    expect(markup).not.toContain("Admin pages");
    expect(markup).not.toContain('href="/admin/wishlist"');
    expect(getAdminDashboardData).not.toHaveBeenCalled();
    expect(getAdminDashboardMetadata).not.toHaveBeenCalled();
  });

  it("offers WorkOS sign-in to anonymous visitors", async () => {
    vi.mocked(getAdminAccessState).mockResolvedValue({
      session: null,
      stale: false,
      viewer: null,
    });
    cookiesMock.mockResolvedValue(makeCookieStore());

    const markup = renderToStaticMarkup(await AdminPage({}));

    expect(markup).toContain('href="/api/auth/login?returnTo=%2Fadmin"');
    expect(markup).toContain("Sign in with WorkOS");
    expect(markup).toContain("one-time code");
    expect(markup).toContain("10 minutes");
    expect(markup).not.toContain("Sign out and switch account");
    expect(markup).not.toContain("Admin pages");
  });

  it("offers sign-out and account-switch recovery to a signed-in non-admin", async () => {
    vi.mocked(getAdminAccessState).mockResolvedValue({
      session: null,
      stale: false,
      viewer: {
        id: "user_workos_reader",
        email: "reader@example.com",
        name: "Reader",
      },
    });
    cookiesMock.mockResolvedValue(makeCookieStore());

    const markup = renderToStaticMarkup(await AdminPage({}));

    expect(markup).toContain("Signed in as");
    expect(markup).toContain("Reader");
    expect(markup).toContain("This account does not have admin access.");
    expect(markup).toContain("Sign out and switch account");
    expect(markup).toContain('href="/api/auth/logout?returnTo=%2Fadmin"');
    expect(markup.match(/Sign out and switch account/g)).toHaveLength(1);
    expect(markup.match(/\/api\/auth\/logout/g)).toHaveLength(1);
    expect(markup).not.toContain(">Sign out</a>");
    expect(markup).not.toContain("Sign in with WorkOS");
    expect(markup).not.toContain("Admin pages");
    expect(getAdminDashboardData).not.toHaveBeenCalled();
    expect(getAdminDashboardMetadata).not.toHaveBeenCalled();
  });

  it("offers forced reauthentication for a live but stale admin session", async () => {
    vi.mocked(getAdminAccessState).mockResolvedValue({
      session: null,
      stale: true,
      viewer: null,
    });
    cookiesMock.mockResolvedValue(makeCookieStore());

    const markup = renderToStaticMarkup(await AdminPage({}));

    expect(markup).toContain("Re-authenticate");
    expect(markup).toContain(
      "/api/auth/login?returnTo=%2Fadmin&amp;maxAge=300",
    );
    expect(markup).not.toContain("Admin pages");
  });

  it("shows denied sign-in feedback from the query string", async () => {
    vi.mocked(getAdminAccessState).mockResolvedValue({
      session: null,
      stale: false,
      viewer: null,
    });
    cookiesMock.mockResolvedValue(makeCookieStore());

    const markup = renderToStaticMarkup(
      await AdminPage({
        searchParams: Promise.resolve({ error: "AccessDenied" }),
      }),
    );

    expect(markup).toContain("Sign-in was denied.");
  });

  it("shows retired-route and post workflow feedback from the query string", async () => {
    vi.mocked(getAdminAccessState).mockResolvedValue({
      session: {
        user: {
          id: "admin-1",
          role: "admin",
        },
      } as never,
      stale: false,
      viewer: null,
    });
    cookiesMock.mockResolvedValue(
      makeCookieStore({ "j2-admin-flash": "saved" }),
    );

    const markup = renderToStaticMarkup(
      await AdminPage({
        searchParams: Promise.resolve({
          saved: "1",
          cloned: "1",
          editRemoved: "1",
        }),
      }),
    );

    expect(markup).toContain("Post saved successfully.");
    expect(markup).not.toContain("Draft clone created successfully.");
    expect(markup).not.toContain(
      "The legacy post edit route has moved into the admin dashboard.",
    );
  });

  it("does not trust flash query params without the matching cookie", async () => {
    vi.mocked(getAdminAccessState).mockResolvedValue({
      session: {
        user: {
          id: "admin-1",
          role: "admin",
        },
      } as never,
      stale: false,
      viewer: null,
    });
    cookiesMock.mockResolvedValue(makeCookieStore());

    const markup = renderToStaticMarkup(
      await AdminPage({
        searchParams: Promise.resolve({
          saved: "1",
          cloned: "1",
          editRemoved: "1",
        }),
      }),
    );

    expect(markup).not.toContain("Post saved successfully.");
    expect(markup).not.toContain("Draft clone created successfully.");
    expect(markup).not.toContain(
      "The legacy post edit route has moved into the admin dashboard.",
    );
  });

  it("renders the inline editor when a valid postId is provided", async () => {
    vi.mocked(getAdminAccessState).mockResolvedValue({
      session: {
        user: {
          id: "admin-1",
          role: "admin",
        },
      } as never,
      stale: false,
      viewer: null,
    });
    cookiesMock.mockResolvedValue(makeCookieStore());
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
    vi.mocked(listAllSeries).mockResolvedValue([
      { id: "series-1", title: "Summer", slug: "summer", description: null },
    ] as never);
    vi.mocked(listAllAdminTags).mockResolvedValue([
      { id: "tag-1", name: "Road trip", slug: "road-trip" },
    ] as never);

    const markup = renderToStaticMarkup(
      await AdminPage({
        searchParams: Promise.resolve({ postId: " post-123 " }),
      }),
    );

    expect(markup).toContain("Edit post");
    expect(markup).toContain("Close editor");
    expect(getAdminEditablePostById).toHaveBeenCalledWith("post-123");
    expect(listAllSeries).toHaveBeenCalled();
    expect(listAllAdminTags).toHaveBeenCalled();
    expect(PostEditorForm).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: "edit",
        post: expect.objectContaining({ id: "post-123" }),
        allSeries: [
          {
            id: "series-1",
            title: "Summer",
            slug: "summer",
            description: null,
          },
        ],
        allTags: [{ id: "tag-1", name: "Road trip", slug: "road-trip" }],
        returnTo: "/admin",
      }),
      undefined,
    );

    const [[props]] = vi.mocked(PostEditorForm).mock.calls;
    await props.action(new FormData());

    expect(updateAdminPostAction).toHaveBeenCalledWith(
      "post-123",
      expect.any(FormData),
    );
  });

  it("preserves dashboard filters in the inline editor close/save path", async () => {
    vi.mocked(getAdminAccessState).mockResolvedValue({
      session: {
        user: {
          id: "admin-1",
          role: "admin",
        },
      } as never,
      stale: false,
      viewer: null,
    });
    cookiesMock.mockResolvedValue(makeCookieStore());
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

    const markup = renderToStaticMarkup(
      await AdminPage({
        searchParams: Promise.resolve({
          postId: "post-123",
          status: "published",
          page: "2",
          search: "coast",
        }),
      }),
    );

    expect(markup).toContain(
      'href="/admin?status=published&amp;page=2&amp;search=coast"',
    );
    expect(PostEditorForm).toHaveBeenCalledWith(
      expect.objectContaining({
        returnTo: "/admin?status=published&page=2&search=coast",
      }),
      undefined,
    );
  });

  it("does not parse admin dashboard filters for public visitors", async () => {
    vi.mocked(getAdminAccessState).mockResolvedValue({
      session: null,
      stale: false,
      viewer: null,
    });
    cookiesMock.mockResolvedValue(makeCookieStore());

    await AdminPage({
      searchParams: Promise.resolve({ status: "not-a-real-status" }),
    });

    expect(parseAdminPostListSearchParams).not.toHaveBeenCalled();
    expect(getAdminDashboardData).not.toHaveBeenCalled();
    expect(getAdminDashboardMetadata).not.toHaveBeenCalled();
  });
});
