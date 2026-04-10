import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";

const redirectError = new Error("NEXT_REDIRECT");

vi.mock("next/navigation", () => ({
  redirect: vi.fn(() => {
    throw redirectError;
  }),
}));

vi.mock("@/lib/auth/session", () => ({
  requireAdminSession: vi.fn(),
}));

import EditAdminPostPage from "@/app/admin/posts/[postId]/edit/page";
import { requireAdminSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";

describe("EditAdminPostPage", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("retires the edit route for admin sessions and sends them back to the dashboard", async () => {
    vi.mocked(requireAdminSession).mockResolvedValue({ user: { id: "admin-1", role: "admin" } } as never);

    await expect(EditAdminPostPage({ params: Promise.resolve({ postId: "post-123" }) })).rejects.toThrow(redirectError);

    expect(redirect).toHaveBeenCalledWith("/admin?postId=post-123&editRemoved=1");
  });

  it("redirects unauthenticated visitors before touching the post boundary", async () => {
    vi.mocked(requireAdminSession).mockResolvedValue(null);

    await expect(EditAdminPostPage({ params: Promise.resolve({ postId: "post-123" }) })).rejects.toThrow(redirectError);

    expect(redirect).toHaveBeenCalledWith("/admin");
  });
});
