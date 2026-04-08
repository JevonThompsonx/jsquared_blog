// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const getSessionMock = vi.fn();
const getSupabaseBrowserClientMock = vi.fn();

vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a href={typeof href === "string" ? href : "#"} {...props}>{children}</a>
  ),
}));

vi.mock("next/image", () => ({
  default: ({ alt, src, ...props }: React.ImgHTMLAttributes<HTMLImageElement>) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img alt={alt} src={src} {...props} />
  ),
}));

vi.mock("@/components/layout/site-header", () => ({
  SiteHeader: () => <div data-testid="site-header">Header</div>,
}));

vi.mock("@/lib/supabase/client", () => ({
  getSupabaseBrowserClient: () => getSupabaseBrowserClientMock(),
}));

import BookmarksPage from "@/app/(blog)/bookmarks/page";

describe("BookmarksPage", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    getSessionMock.mockReset();
    getSupabaseBrowserClientMock.mockReset();
    vi.restoreAllMocks();
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });
    container.remove();
    vi.unstubAllGlobals();
  });

  async function renderPage() {
    await act(async () => {
      root.render(<BookmarksPage />);
    });

    await act(async () => {
      await Promise.resolve();
    });
  }

  it("prompts unauthenticated users to sign in", async () => {
    getSupabaseBrowserClientMock.mockReturnValue({
      auth: { getSession: getSessionMock.mockResolvedValue({ data: { session: null } }) },
    });

    await renderPage();

    expect(container.textContent).toContain("Sign in to see your saved posts");
    expect(container.querySelector('a[href="/login?redirectTo=/bookmarks"]')).not.toBeNull();
  });

  it("renders the empty state when the authenticated user has no saved posts", async () => {
    getSupabaseBrowserClientMock.mockReturnValue({
      auth: { getSession: getSessionMock.mockResolvedValue({ data: { session: { access_token: "token-1" } } }) },
    });

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ posts: [] }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await renderPage();

    expect(fetchMock).toHaveBeenCalledWith("/api/bookmarks", {
      headers: { Authorization: "Bearer token-1" },
    });
    expect(container.textContent).toContain("No saved posts yet");
    expect(container.querySelector('a[href="/"]')).not.toBeNull();
  });

  it("shows a retry-style load error when session lookup rejects", async () => {
    getSupabaseBrowserClientMock.mockReturnValue({
      auth: { getSession: getSessionMock.mockRejectedValue(new Error("session failed")) },
    });

    await renderPage();

    expect(container.textContent).toContain("Failed to load saved posts");
    expect(container.textContent).toContain("Please refresh and try again.");
  });

  it("shows a retry-style load error instead of the empty state when bookmark loading fails", async () => {
    getSupabaseBrowserClientMock.mockReturnValue({
      auth: { getSession: getSessionMock.mockResolvedValue({ data: { session: { access_token: "token-1" } } }) },
    });

    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({ error: "Failed to load bookmarks" }),
    }));

    await renderPage();

    expect(container.textContent).toContain("Failed to load saved posts");
    expect(container.textContent).not.toContain("No saved posts yet");
    expect(container.textContent).toContain("Please refresh and try again.");
  });

  it("returns to the sign-in state when bookmark loading is unauthorized", async () => {
    getSupabaseBrowserClientMock.mockReturnValue({
      auth: { getSession: getSessionMock.mockResolvedValue({ data: { session: { access_token: "token-1" } } }) },
    });

    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ error: "Unauthorized" }),
    }));

    await renderPage();

    expect(container.textContent).toContain("Sign in to see your saved posts");
    expect(container.textContent).not.toContain("Failed to load saved posts");
  });

  it("shows a retry-style load error when the bookmark request rejects", async () => {
    getSupabaseBrowserClientMock.mockReturnValue({
      auth: { getSession: getSessionMock.mockResolvedValue({ data: { session: { access_token: "token-1" } } }) },
    });

    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network offline")));

    await renderPage();

    expect(container.textContent).toContain("Failed to load saved posts");
    expect(container.textContent).toContain("Please refresh and try again.");
  });

  it("shows a retry-style load error when the bookmark payload is malformed", async () => {
    getSupabaseBrowserClientMock.mockReturnValue({
      auth: { getSession: getSessionMock.mockResolvedValue({ data: { session: { access_token: "token-1" } } }) },
    });

    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ posts: [{ id: "post-1" }] }),
    }));

    await renderPage();

    expect(container.textContent).toContain("Failed to load saved posts");
    expect(container.textContent).not.toContain("No saved posts yet");
  });
});
