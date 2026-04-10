import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth/session", () => ({
  requireAdminSession: vi.fn(),
}));

import { NextRequest } from "next/server";

import { GET } from "@/app/admin/posts/[postId]/edit/route";
import { requireAdminSession } from "@/lib/auth/session";

describe("admin post edit redirect route", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("retires the edit route for admin sessions and sends them back to the dashboard", async () => {
    vi.mocked(requireAdminSession).mockResolvedValue({ user: { id: "admin-1", role: "admin" } } as never);
    const response = await GET(new NextRequest("http://localhost/admin/posts/post-123/edit"), {
      params: Promise.resolve({ postId: "post-123" }),
    });

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://localhost/admin?postId=post-123&editRemoved=1");
    expect(response.cookies.get("j2-admin-flash")?.value).toBe("editRemoved");
  });

  it("redirects unauthenticated visitors before touching the post boundary", async () => {
    vi.mocked(requireAdminSession).mockResolvedValue(null);

    const response = await GET(new NextRequest("http://localhost/admin/posts/post-123/edit"), {
      params: Promise.resolve({ postId: "post-123" }),
    });

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://localhost/admin");
    expect(response.cookies.get("j2-admin-flash")).toBeUndefined();
  });
});
