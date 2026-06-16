import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";

const redirectError = new Error("NEXT_REDIRECT");

vi.mock("next/navigation", () => ({
  redirect: vi.fn(() => {
    throw redirectError;
  }),
}));

vi.mock("next/link", () => ({
  default: ({ children }: { children: unknown }) => children,
}));

vi.mock("@/components/layout/site-header", () => ({
  SiteHeader: () => null,
}));

vi.mock("@/lib/auth/session", () => ({
  requireAdminSession: vi.fn(),
}));

const { mockCaptureException } = vi.hoisted(() => ({
  mockCaptureException: vi.fn(),
}));

vi.mock("@/lib/sentry", () => ({
  captureException: mockCaptureException,
}));

vi.mock("@/server/dal/categories", () => ({
  listAllCategoriesWithCounts: vi.fn(),
}));

vi.mock("@/app/admin/categories/actions", () => ({
  createCategoryAction: vi.fn(),
  deleteCategoryAction: vi.fn(),
  updateCategoryAction: vi.fn(),
}));

import AdminCategoriesPage from "@/app/admin/categories/page";
import { requireAdminSession } from "@/lib/auth/session";
import { captureException } from "@/lib/sentry";
import { listAllCategoriesWithCounts } from "@/server/dal/categories";

describe("AdminCategoriesPage", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("redirects unauthenticated visitors before loading categories", async () => {
    vi.mocked(requireAdminSession).mockResolvedValue(null);

    await expect(AdminCategoriesPage({})).rejects.toThrow(redirectError);

    expect(listAllCategoriesWithCounts).not.toHaveBeenCalled();
  });

  it("redirects non-admin visitors before loading categories", async () => {
    vi.mocked(requireAdminSession).mockResolvedValue({ user: { id: "reader-1", role: "reader" } } as never);

    await expect(AdminCategoriesPage({})).rejects.toThrow(redirectError);

    expect(listAllCategoriesWithCounts).not.toHaveBeenCalled();
  });

  it("renders category management rows for admin sessions", async () => {
    const createdAt = new Date("2026-06-15T12:00:00Z");
    const updatedAt = new Date("2026-06-15T12:30:00Z");
    vi.mocked(requireAdminSession).mockResolvedValue({ user: { id: "admin-1", role: "admin" } } as never);
    vi.mocked(listAllCategoriesWithCounts).mockResolvedValue([
      {
        id: "category-roads",
        name: "Roads",
        slug: "roads",
        description: "On the road",
        postCount: 2,
        createdAt,
        updatedAt,
      },
    ] as never);

    const markup = renderToStaticMarkup(await AdminCategoriesPage({}));

    expect(markup).toContain("Manage Categories");
    expect(markup).toContain("Roads");
    expect(markup).toContain("/category/roads");
    expect(markup).toContain("On the road");
    expect(markup).toContain("2 posts");
    expect(markup).toContain("data-testid=\"admin-categories-list\"");
  });

  it("renders an empty state when no categories exist", async () => {
    vi.mocked(requireAdminSession).mockResolvedValue({ user: { id: "admin-1", role: "admin" } } as never);
    vi.mocked(listAllCategoriesWithCounts).mockResolvedValue([] as never);

    const markup = renderToStaticMarkup(await AdminCategoriesPage({}));

    expect(markup).toContain("No categories yet");
    expect(markup).toContain("data-testid=\"admin-categories-empty\"");
  });

  it("renders a SlugTaken error when the searchParams carry the slug conflict marker", async () => {
    vi.mocked(requireAdminSession).mockResolvedValue({ user: { id: "admin-1", role: "admin" } } as never);
    vi.mocked(listAllCategoriesWithCounts).mockResolvedValue([] as never);

    const markup = renderToStaticMarkup(
      await AdminCategoriesPage({
        searchParams: Promise.resolve({ error: "SlugTaken", slug: "roads" }),
      }),
    );

    expect(markup).toContain("Another category already uses that slug");
    expect(markup).toContain("data-testid=\"admin-categories-error\"");
  });

  it("renders a CategoryInUse error with the post count", async () => {
    vi.mocked(requireAdminSession).mockResolvedValue({ user: { id: "admin-1", role: "admin" } } as never);
    vi.mocked(listAllCategoriesWithCounts).mockResolvedValue([] as never);

    const markup = renderToStaticMarkup(
      await AdminCategoriesPage({
        searchParams: Promise.resolve({ error: "CategoryInUse", posts: "3" }),
      }),
    );

    expect(markup).toContain("Cannot delete: 3 post(s) still use this category");
  });

  it("disables the delete button when a category has posts attached", async () => {
    const createdAt = new Date("2026-06-15T12:00:00Z");
    const updatedAt = new Date("2026-06-15T12:30:00Z");
    vi.mocked(requireAdminSession).mockResolvedValue({ user: { id: "admin-1", role: "admin" } } as never);
    vi.mocked(listAllCategoriesWithCounts).mockResolvedValue([
      {
        id: "category-roads",
        name: "Roads",
        slug: "roads",
        description: null,
        postCount: 5,
        createdAt,
        updatedAt,
      },
    ] as never);

    const markup = renderToStaticMarkup(await AdminCategoriesPage({}));

    expect(markup).toContain("data-testid=\"admin-category-delete-form\"");
    expect(markup).toContain("Cannot delete: 5 post(s) still use this category");
  });

  it("renders the create form for an empty category list", async () => {
    vi.mocked(requireAdminSession).mockResolvedValue({ user: { id: "admin-1", role: "admin" } } as never);
    vi.mocked(listAllCategoriesWithCounts).mockResolvedValue([] as never);

    const markup = renderToStaticMarkup(await AdminCategoriesPage({}));

    expect(markup).toContain("data-testid=\"admin-categories-create-form\"");
    expect(markup).toContain("Create category");
  });

  it("renders a load failure message when the DAL throws", async () => {
    vi.mocked(requireAdminSession).mockResolvedValue({ user: { id: "admin-1", role: "admin" } } as never);
    vi.mocked(listAllCategoriesWithCounts).mockRejectedValue(new Error("database unavailable"));

    const markup = renderToStaticMarkup(await AdminCategoriesPage({}));

    expect(markup).toContain("Category data is temporarily unavailable");
    // C12: positive data-testid on the load-failed branch.
    expect(markup).toContain("data-testid=\"admin-categories-load-failed\"");
  });

  it("captures the load failure in Sentry (C13: not just console.error)", async () => {
    vi.mocked(requireAdminSession).mockResolvedValue({ user: { id: "admin-1", role: "admin" } } as never);
    const error = new Error("database unavailable");
    vi.mocked(listAllCategoriesWithCounts).mockRejectedValue(error);

    await AdminCategoriesPage({});

    expect(captureException).toHaveBeenCalledWith(error, { area: "admin-categories" });
  });
});
