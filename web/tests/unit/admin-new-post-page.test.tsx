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

vi.mock("@/components/admin/post-editor-form", () => ({
  PostEditorForm: vi.fn(() => null),
}));

vi.mock("@/components/layout/site-header", () => ({
  SiteHeader: () => null,
}));

vi.mock("@/lib/auth/session", () => ({
  requireAdminSession: vi.fn(),
}));

vi.mock("@/server/dal/admin-posts", () => ({
  listAdminCategories: vi.fn(() => Promise.resolve([])),
  listAllAdminTags: vi.fn(() => Promise.resolve([])),
}));

vi.mock("@/server/dal/series", () => ({
  listAllSeries: vi.fn(() => Promise.resolve([])),
}));

vi.mock("@/app/admin/actions", () => ({
  createAdminPostAction: vi.fn(),
}));

import NewAdminPostPage from "@/app/admin/posts/new/page";
import { createAdminPostAction } from "@/app/admin/actions";
import { PostEditorForm } from "@/components/admin/post-editor-form";
import { requireAdminSession } from "@/lib/auth/session";
import { listAdminCategories, listAllAdminTags } from "@/server/dal/admin-posts";
import { listAllSeries } from "@/server/dal/series";
import { redirect } from "next/navigation";

describe("NewAdminPostPage", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("redirects unauthenticated visitors before loading editor metadata", async () => {
    vi.mocked(requireAdminSession).mockResolvedValue(null);

    await expect(NewAdminPostPage()).rejects.toThrow(redirectError);

    expect(redirect).toHaveBeenCalledWith("/admin");
    expect(listAdminCategories).not.toHaveBeenCalled();
    expect(listAllSeries).not.toHaveBeenCalled();
    expect(listAllAdminTags).not.toHaveBeenCalled();
  });

  it("redirects non-admin sessions before loading editor metadata", async () => {
    vi.mocked(requireAdminSession).mockResolvedValue({ user: { id: "editor-1", role: "editor" } } as never);

    await expect(NewAdminPostPage()).rejects.toThrow(redirectError);

    expect(redirect).toHaveBeenCalledWith("/admin");
    expect(listAdminCategories).not.toHaveBeenCalled();
    expect(listAllSeries).not.toHaveBeenCalled();
    expect(listAllAdminTags).not.toHaveBeenCalled();
  });

  it("renders the create editor for admin sessions", async () => {
    vi.mocked(requireAdminSession).mockResolvedValue({ user: { id: "admin-1", role: "admin" } } as never);
    vi.mocked(listAdminCategories).mockResolvedValue([{ id: "cat-1", name: "Travel", slug: "travel" }] as never);
    vi.mocked(listAllSeries).mockResolvedValue([{ id: "series-1", title: "Summer", slug: "summer" }] as never);
    vi.mocked(listAllAdminTags).mockResolvedValue([{ id: "tag-1", name: "Road trip", slug: "road-trip" }] as never);

    const markup = renderToStaticMarkup(await NewAdminPostPage());

    expect(markup).toContain("Create post");
    expect(PostEditorForm).toHaveBeenCalledWith(
      expect.objectContaining({
        action: createAdminPostAction,
        mode: "create",
        categories: [{ id: "cat-1", name: "Travel", slug: "travel" }],
        allSeries: [{ id: "series-1", title: "Summer", slug: "summer" }],
        allTags: [{ id: "tag-1", name: "Road trip", slug: "road-trip" }],
      }),
      undefined,
    );
  });
});
