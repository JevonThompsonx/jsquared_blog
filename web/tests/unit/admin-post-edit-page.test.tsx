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
  getAdminEditablePostById: vi.fn(),
  listAdminCategories: vi.fn(() => Promise.resolve([])),
  listAllAdminTags: vi.fn(() => Promise.resolve([])),
}));

vi.mock("@/server/dal/series", () => ({
  listAllSeries: vi.fn(() => Promise.resolve([])),
}));

vi.mock("@/app/admin/actions", () => ({
  updateAdminPostAction: vi.fn(),
}));

import EditAdminPostPage from "@/app/admin/posts/[postId]/edit/page";
import { updateAdminPostAction } from "@/app/admin/actions";
import { PostEditorForm } from "@/components/admin/post-editor-form";
import { requireAdminSession } from "@/lib/auth/session";
import { getAdminEditablePostById } from "@/server/dal/admin-posts";
import { notFound, redirect } from "next/navigation";

describe("EditAdminPostPage route param validation", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("fails closed on whitespace-only post ids before loading post data", async () => {
    vi.mocked(requireAdminSession).mockResolvedValue({ user: { id: "admin-1", role: "admin" } } as never);

    await expect(EditAdminPostPage({ params: Promise.resolve({ postId: "   " }) })).rejects.toThrow(notFoundError);

    expect(getAdminEditablePostById).not.toHaveBeenCalled();
    expect(updateAdminPostAction).not.toHaveBeenCalled();
    expect(notFound).toHaveBeenCalled();
  });

  it("trims valid post ids before loading the editor data", async () => {
    vi.mocked(requireAdminSession).mockResolvedValue({ user: { id: "admin-1", role: "admin" } } as never);
    vi.mocked(getAdminEditablePostById).mockResolvedValue(null);

    await expect(EditAdminPostPage({ params: Promise.resolve({ postId: "  post-123  " }) })).rejects.toThrow(notFoundError);

    expect(getAdminEditablePostById).toHaveBeenCalledWith("post-123");
    expect(notFound).toHaveBeenCalled();
  });

  it("passes the trimmed post id through to the editor action wiring", async () => {
    const formData = new FormData();

    vi.mocked(requireAdminSession).mockResolvedValue({ user: { id: "admin-1", role: "admin" } } as never);
    vi.mocked(getAdminEditablePostById).mockResolvedValue({
      id: "post-123",
      title: "Admin fixture",
      slug: "admin-fixture",
      status: "draft",
    } as never);

    const markup = renderToStaticMarkup(
      await EditAdminPostPage({ params: Promise.resolve({ postId: "  post-123  " }) }),
    );

    expect(markup).toBeTruthy();

    expect(PostEditorForm).toHaveBeenCalledWith(
      expect.objectContaining({
        post: expect.objectContaining({ id: "post-123" }),
      }),
      undefined,
    );

    const firstCall = vi.mocked(PostEditorForm).mock.calls[0];
    expect(firstCall).toBeDefined();

    const [props] = firstCall!;
    await props.action(formData);

    expect(updateAdminPostAction).toHaveBeenCalledWith("post-123", formData);
  });

  it("redirects unauthenticated visitors before touching the post boundary", async () => {
    vi.mocked(requireAdminSession).mockResolvedValue(null);

    await expect(EditAdminPostPage({ params: Promise.resolve({ postId: "post-123" }) })).rejects.toThrow(redirectError);

    expect(redirect).toHaveBeenCalledWith("/admin");
    expect(getAdminEditablePostById).not.toHaveBeenCalled();
  });
});
