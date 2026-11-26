// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const useAuthMock = vi.fn();

vi.mock("@workos-inc/authkit-nextjs/components", () => ({
  useAuth: () => useAuthMock(),
}));

vi.mock("@/components/layout/site-header", () => ({
  SiteHeader: () => <div data-testid="site-header" />,
}));

vi.mock("@/components/blog/cdn-image", () => ({
  CdnImage: ({ alt }: { alt?: string }) => (
    <div data-testid="cdn-image">{alt}</div>
  ),
}));

import BookmarksPage from "@/app/(blog)/bookmarks/page";

describe("BookmarksPage", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("prompts anonymous readers to sign in", async () => {
    useAuthMock.mockReturnValue({ user: null, loading: false });
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await act(async () => root.render(<BookmarksPage />));
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(container.textContent?.toLowerCase()).toContain("sign in");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("loads saved posts with the cookie session", async () => {
    useAuthMock.mockReturnValue({
      user: { id: "reader-1", email: "reader@example.com" },
      loading: false,
    });
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        posts: [
          {
            id: "post-1",
            title: "Saved Trail",
            slug: "saved-trail",
            excerpt: null,
            imageUrl: null,
            bookmarkedAt: "2026-11-24T12:00:00.000Z",
          },
        ],
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await act(async () => root.render(<BookmarksPage />));
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(container.textContent).toContain("Saved Trail");
    expect(fetchMock).toHaveBeenCalledWith("/api/bookmarks");
  });
});
