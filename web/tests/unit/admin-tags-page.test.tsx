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

vi.mock("@/server/dal/admin-tags", () => ({
  listAllTagsWithCounts: vi.fn(),
}));

vi.mock("@/app/admin/tags/actions", () => ({
  createTagAction: vi.fn(),
  deleteTagAction: vi.fn(),
  updateTagDescriptionAction: vi.fn(),
}));

import AdminTagsPage from "@/app/admin/tags/page";
import { requireAdminSession } from "@/lib/auth/session";
import { listAllTagsWithCounts } from "@/server/dal/admin-tags";

describe("AdminTagsPage", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("redirects unauthenticated visitors before loading tag data", async () => {
    vi.mocked(requireAdminSession).mockResolvedValue(null);

    await expect(AdminTagsPage({})).rejects.toThrow(redirectError);

    expect(listAllTagsWithCounts).not.toHaveBeenCalled();
  });

  it("redirects non-admin visitors before loading tag data", async () => {
    vi.mocked(requireAdminSession).mockResolvedValue({ user: { id: "reader-1", role: "reader" } } as never);

    await expect(AdminTagsPage({})).rejects.toThrow(redirectError);

    expect(listAllTagsWithCounts).not.toHaveBeenCalled();
  });

  it("renders tag management rows for admin sessions", async () => {
    vi.mocked(requireAdminSession).mockResolvedValue({ user: { id: "admin-1", role: "admin" } } as never);
    vi.mocked(listAllTagsWithCounts).mockResolvedValue([
      {
        id: "tag-1",
        name: "Road trip",
        slug: "road-trip",
        description: "Scenic drives and overland stories.",
        postCount: 2,
      },
    ] as never);

    const markup = renderToStaticMarkup(await AdminTagsPage({}));

    expect(markup).toContain("Manage Tags");
    expect(markup).toContain("Road trip");
    expect(markup).toContain("/tag/road-trip");
    expect(markup).toContain("Scenic drives and overland stories.");
    expect(markup).toContain("2 posts");
    expect(markup).toContain("data-testid=\"admin-tags-list\"");
    expect(markup).toContain("data-testid=\"admin-tag-description-form\"");
  });

  it("renders a create form alongside the tag list", async () => {
    vi.mocked(requireAdminSession).mockResolvedValue({ user: { id: "admin-1", role: "admin" } } as never);
    vi.mocked(listAllTagsWithCounts).mockResolvedValue([] as never);

    const markup = renderToStaticMarkup(await AdminTagsPage({}));

    expect(markup).toContain("data-testid=\"admin-tags-create-form\"");
    expect(markup).toContain("Create tag");
    expect(markup).toContain("data-testid=\"admin-tags-empty\"");
  });

  it("disables the delete button when a tag has posts attached", async () => {
    vi.mocked(requireAdminSession).mockResolvedValue({ user: { id: "admin-1", role: "admin" } } as never);
    vi.mocked(listAllTagsWithCounts).mockResolvedValue([
      {
        id: "tag-1",
        name: "Road trip",
        slug: "road-trip",
        description: null,
        postCount: 4,
      },
    ] as never);

    const markup = renderToStaticMarkup(await AdminTagsPage({}));

    expect(markup).toContain("data-testid=\"admin-tag-delete-form\"");
    expect(markup).toContain("Cannot delete: 4 post(s) still use this tag");
  });

  it("renders a SlugTaken error when the searchParams carry the slug conflict marker", async () => {
    vi.mocked(requireAdminSession).mockResolvedValue({ user: { id: "admin-1", role: "admin" } } as never);
    vi.mocked(listAllTagsWithCounts).mockResolvedValue([] as never);

    const markup = renderToStaticMarkup(
      await AdminTagsPage({
        searchParams: Promise.resolve({ error: "SlugTaken", slug: "overland" }),
      }),
    );

    expect(markup).toContain("Another tag already uses that slug");
    expect(markup).toContain("data-testid=\"admin-tags-error\"");
  });

  it("renders a TagInUse error with the post count", async () => {
    vi.mocked(requireAdminSession).mockResolvedValue({ user: { id: "admin-1", role: "admin" } } as never);
    vi.mocked(listAllTagsWithCounts).mockResolvedValue([] as never);

    const markup = renderToStaticMarkup(
      await AdminTagsPage({
        searchParams: Promise.resolve({ error: "TagInUse", posts: "2" }),
      }),
    );

    expect(markup).toContain("Cannot delete: 2 post(s) still use this tag");
  });
});
