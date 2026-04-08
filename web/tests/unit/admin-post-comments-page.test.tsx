import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";

const notFoundError = new Error("NEXT_NOT_FOUND");
const redirectError = new Error("NEXT_REDIRECT");

vi.mock("next/navigation", () => ({
  notFound: vi.fn(() => {
    throw notFoundError;
  }),
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

vi.mock("@/components/admin/admin-comments-panel", () => ({
  AdminCommentsPanel: vi.fn(() => null),
}));

vi.mock("@/lib/auth/session", () => ({
  requireAdminSession: vi.fn(),
}));

vi.mock("@/server/dal/admin-posts", () => ({
  getAdminEditablePostById: vi.fn(),
}));

import AdminPostCommentsPage from "@/app/admin/posts/[postId]/comments/page";
import { AdminCommentsPanel } from "@/components/admin/admin-comments-panel";
import { requireAdminSession } from "@/lib/auth/session";
import { getAdminEditablePostById } from "@/server/dal/admin-posts";
import { notFound, redirect } from "next/navigation";

describe("AdminPostCommentsPage route param validation", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("fails closed on whitespace-only post ids before loading moderation data", async () => {
    vi.mocked(requireAdminSession).mockResolvedValue({ user: { id: "admin-1", role: "admin" } } as never);

    await expect(AdminPostCommentsPage({ params: Promise.resolve({ postId: "   " }) })).rejects.toThrow(notFoundError);

    expect(getAdminEditablePostById).not.toHaveBeenCalled();
    expect(AdminCommentsPanel).not.toHaveBeenCalled();
    expect(notFound).toHaveBeenCalled();
  });

  it("trims valid post ids before loading moderation data", async () => {
    vi.mocked(requireAdminSession).mockResolvedValue({ user: { id: "admin-1", role: "admin" } } as never);
    vi.mocked(getAdminEditablePostById).mockResolvedValue(null);

    await expect(AdminPostCommentsPage({ params: Promise.resolve({ postId: "  post-123  " }) })).rejects.toThrow(notFoundError);

    expect(getAdminEditablePostById).toHaveBeenCalledWith("post-123");
    expect(notFound).toHaveBeenCalled();
  });

  it("passes the trimmed post id through to the moderation panel", async () => {
    vi.mocked(requireAdminSession).mockResolvedValue({ user: { id: "admin-1", role: "admin" } } as never);
    vi.mocked(getAdminEditablePostById).mockResolvedValue({
      id: "post-123",
      title: "Admin fixture",
    } as never);

    const markup = renderToStaticMarkup(
      await AdminPostCommentsPage({ params: Promise.resolve({ postId: "  post-123  " }) }),
    );

    expect(markup).toBeTruthy();

    expect(getAdminEditablePostById).toHaveBeenCalledWith("post-123");
    expect(AdminCommentsPanel).toHaveBeenCalledWith(
      expect.objectContaining({ postId: "post-123" }),
      undefined,
    );
  });

  it("redirects unauthenticated visitors before touching the comments boundary", async () => {
    vi.mocked(requireAdminSession).mockResolvedValue(null);

    await expect(AdminPostCommentsPage({ params: Promise.resolve({ postId: "post-123" }) })).rejects.toThrow(redirectError);

    expect(redirect).toHaveBeenCalledWith("/admin");
    expect(getAdminEditablePostById).not.toHaveBeenCalled();
  });
});
