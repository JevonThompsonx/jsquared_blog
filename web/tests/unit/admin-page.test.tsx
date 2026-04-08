import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/components/layout/site-header", () => ({
  SiteHeader: () => createElement("div", { "data-testid": "site-header" }, "Header"),
}));

vi.mock("@/components/auth/admin-auth-button", () => ({
  AdminAuthButton: ({ disabled, isSignedIn }: { disabled: boolean; isSignedIn: boolean }) =>
    createElement(
      "button",
      {
        "data-testid": "admin-auth-button",
        "data-disabled": String(disabled),
        "data-signed-in": String(isSignedIn),
      },
      "Admin auth",
    ),
}));

vi.mock("@/components/admin/admin-dashboard", () => ({
  AdminDashboard: ({ counts, categories }: { counts: { total: number }; categories: string[] }) =>
    createElement(
      "div",
      {
        "data-testid": "admin-dashboard",
        "data-total": String(counts.total),
        "data-categories": categories.join(","),
      },
      "Dashboard",
    ),
}));

vi.mock("@/lib/auth/admin", () => ({
  isAdminAuthConfigured: vi.fn(),
}));

vi.mock("@/lib/auth/session", () => ({
  requireAdminSession: vi.fn(),
}));

vi.mock("@/server/forms/admin-post-list", () => ({
  parseAdminPostListSearchParams: vi.fn(),
}));

vi.mock("@/server/queries/admin-dashboard", () => ({
  getAdminDashboardData: vi.fn(),
  getAdminDashboardMetadata: vi.fn(),
}));

import AdminPage from "@/app/admin/page";
import { isAdminAuthConfigured } from "@/lib/auth/admin";
import { requireAdminSession } from "@/lib/auth/session";
import type { AdminPostListFilters } from "@/server/dal/admin-posts";
import { parseAdminPostListSearchParams } from "@/server/forms/admin-post-list";
import { getAdminDashboardData, getAdminDashboardMetadata } from "@/server/queries/admin-dashboard";

describe("AdminPage", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  const defaultFilters: AdminPostListFilters = {
    query: "",
    page: 1,
    pageSize: 24,
    sort: "updated-desc",
  };

  it("shows generic public-facing auth guidance without leaking env variable names", async () => {
    vi.mocked(isAdminAuthConfigured).mockReturnValue(false);
    vi.mocked(requireAdminSession).mockResolvedValue(null);
    vi.mocked(parseAdminPostListSearchParams).mockReturnValue(defaultFilters);

    const markup = renderToStaticMarkup(
      await AdminPage({
        searchParams: Promise.resolve({ error: "AccessDenied" }),
      }),
    );

    expect(markup).toContain("Admin sign-in is not available right now.");
    expect(markup).toContain("Sign-in was denied.");
    expect(markup).not.toContain("AUTH_SECRET");
    expect(markup).not.toContain("AUTH_GITHUB_ID");
    expect(markup).not.toContain("AUTH_GITHUB_SECRET");
    expect(markup).not.toContain("AUTH_ADMIN_GITHUB_IDS");
  });

  it("does not load dashboard data for non-admin sessions", async () => {
    vi.mocked(isAdminAuthConfigured).mockReturnValue(true);
    vi.mocked(requireAdminSession).mockResolvedValue({ user: { id: "user-1", role: "editor" } } as never);
    vi.mocked(parseAdminPostListSearchParams).mockReturnValue({
      query: "drafts",
      page: 2,
      pageSize: 10,
      sort: "updated-desc",
    } satisfies AdminPostListFilters);

    const markup = renderToStaticMarkup(await AdminPage({ searchParams: Promise.resolve({ query: "drafts" }) }));

    expect(getAdminDashboardData).not.toHaveBeenCalled();
    expect(getAdminDashboardMetadata).not.toHaveBeenCalled();
    expect(markup).not.toContain('data-testid="admin-dashboard"');
  });

  it("renders the admin dashboard for admin sessions with parsed filters", async () => {
    const parsedFilters = {
      query: "road trip",
      page: 3,
      pageSize: 12,
      sort: "updated-desc",
    } satisfies AdminPostListFilters;

    vi.mocked(isAdminAuthConfigured).mockReturnValue(true);
    vi.mocked(requireAdminSession).mockResolvedValue({
      user: {
        id: "admin-1",
        role: "admin",
        githubLogin: "octocat",
      },
    } as never);
    vi.mocked(parseAdminPostListSearchParams).mockReturnValue(parsedFilters);
    vi.mocked(getAdminDashboardData).mockResolvedValue({
      counts: { total: 7, published: 3, draft: 2, scheduled: 2 },
      posts: {
        posts: [],
        totalCount: 0,
        page: 3,
        pageSize: 12,
        totalPages: 1,
        filters: parsedFilters,
      },
    });
    vi.mocked(getAdminDashboardMetadata).mockResolvedValue({
      categories: [
        { id: "cat-1", name: "Travel", slug: "travel" },
        { id: "cat-2", name: "Camping", slug: "camping" },
      ],
    });

    const markup = renderToStaticMarkup(await AdminPage({ searchParams: Promise.resolve({ query: "road trip" }) }));

    expect(getAdminDashboardData).toHaveBeenCalledWith(parsedFilters);
    expect(getAdminDashboardMetadata).toHaveBeenCalledOnce();
    expect(markup).toContain('data-testid="admin-dashboard"');
    expect(markup).toContain('data-total="7"');
    expect(markup).toContain("Signed in as `octocat`");
  });
});
