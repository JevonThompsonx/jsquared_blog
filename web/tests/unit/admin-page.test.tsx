import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/components/admin/admin-dashboard", () => ({
  AdminDashboard: () => <div data-testid="admin-dashboard">Dashboard</div>,
}));

vi.mock("@/components/auth/admin-auth-button", () => ({
  AdminAuthButton: () => <button type="button">Admin sign in</button>,
}));

vi.mock("@/components/layout/site-header", () => ({
  SiteHeader: () => null,
}));

vi.mock("@/lib/auth/admin", () => ({
  isAdminAuthConfigured: vi.fn(() => true),
}));

vi.mock("@/lib/auth/session", () => ({
  requireAdminSession: vi.fn(),
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
import { isAdminAuthConfigured } from "@/lib/auth/admin";
import { requireAdminSession } from "@/lib/auth/session";
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
