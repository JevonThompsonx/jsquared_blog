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
  updateTagDescriptionAction: vi.fn(),
}));

import AdminTagsPage from "@/app/admin/tags/page";
import { requireAdminSession } from "@/lib/auth/session";
import { listAllTagsWithCounts } from "@/server/dal/admin-tags";
import { redirect } from "next/navigation";

describe("AdminTagsPage", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("redirects unauthenticated visitors before loading tag data", async () => {
    vi.mocked(requireAdminSession).mockResolvedValue(null);

    await expect(AdminTagsPage()).rejects.toThrow(redirectError);

    expect(redirect).toHaveBeenCalledWith("/admin");
    expect(listAllTagsWithCounts).not.toHaveBeenCalled();
  });

  it("redirects non-admin visitors before loading tag data", async () => {
    vi.mocked(requireAdminSession).mockResolvedValue({ user: { id: "reader-1", role: "reader" } } as never);

    await expect(AdminTagsPage()).rejects.toThrow(redirectError);

    expect(redirect).toHaveBeenCalledWith("/admin");
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

    const markup = renderToStaticMarkup(await AdminTagsPage());

    expect(markup).toContain("Manage Tags");
    expect(markup).toContain("Road trip");
    expect(markup).toContain("/tag/road-trip");
    expect(markup).toContain("Scenic drives and overland stories.");
    expect(markup).toContain("2 posts");
  });
});
