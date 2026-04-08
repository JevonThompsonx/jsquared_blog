import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const notFoundError = new Error("NEXT_NOT_FOUND");

vi.mock("next/navigation", () => ({
  notFound: vi.fn(() => {
    throw notFoundError;
  }),
}));

vi.mock("next/image", () => ({
  default: ({ alt, src }: { alt: string; src: string }) => createElement("img", { alt, src }),
}));

vi.mock("@/components/layout/site-header", () => ({
  SiteHeader: () => createElement("div", { "data-testid": "site-header" }, "Header shell"),
}));

vi.mock("@/server/dal/profiles", () => ({
  getPublicAuthorProfileById: vi.fn(),
}));

vi.mock("@/server/dal/comments", () => ({
  countCommentsByUserId: vi.fn(),
  listCommentsByUserId: vi.fn(),
}));

import AuthorProfilePage, { generateMetadata } from "@/app/(blog)/author/[id]/page";
import { countCommentsByUserId, listCommentsByUserId } from "@/server/dal/comments";
import { getPublicAuthorProfileById } from "@/server/dal/profiles";
import { notFound } from "next/navigation";

const publicProfile = {
  userId: "user-1",
  displayName: "Avery Trail",
  avatarUrl: null,
  bio: "Backpacking every chance I get.",
  memberSince: new Date("2023-06-01T00:00:00.000Z"),
};

describe("AuthorProfilePage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("builds metadata from the public author profile", async () => {
    vi.mocked(getPublicAuthorProfileById).mockResolvedValue(publicProfile);

    const metadata = await generateMetadata({ params: Promise.resolve({ id: "user-1" }) });

    expect(getPublicAuthorProfileById).toHaveBeenCalledWith("user-1");
    expect(metadata.title).toBe("Avery Trail — J²Adventures");
    expect(metadata.description).toBe("Backpacking every chance I get.");
  });

  it("renders the empty activity state when the author has no visible comments", async () => {
    vi.mocked(getPublicAuthorProfileById).mockResolvedValue(publicProfile);
    vi.mocked(listCommentsByUserId).mockResolvedValue([]);
    vi.mocked(countCommentsByUserId).mockResolvedValue(0);

    const markup = renderToStaticMarkup(await AuthorProfilePage({ params: Promise.resolve({ id: "user-1" }) }));

    expect(getPublicAuthorProfileById).toHaveBeenCalledWith("user-1");
    expect(listCommentsByUserId).toHaveBeenCalledWith("user-1", 20);
    expect(countCommentsByUserId).toHaveBeenCalledWith("user-1");
    expect(markup).toContain('data-testid="site-header"');
    expect(markup).toContain("Avery Trail");
    expect(markup).toContain("Backpacking every chance I get.");
    expect(markup).toContain("No comments yet — check back later.");
    expect(markup).toContain('href="/"');
  });

  it("renders recent comments, reply badges, and like totals", async () => {
    vi.mocked(getPublicAuthorProfileById).mockResolvedValue({
      ...publicProfile,
      avatarUrl: "j2:mountain",
    });
    vi.mocked(listCommentsByUserId).mockResolvedValue([
      {
        id: "comment-1",
        content: "A trail update from the ridge.",
        parentId: null,
        createdAt: new Date("2024-02-02T00:00:00.000Z"),
        likeCount: 2,
        post: { id: "post-1", title: "Ridge Day", slug: "ridge-day" },
      },
      {
        id: "comment-2",
        content: "Replying with campsite details.",
        parentId: "comment-1",
        createdAt: new Date("2024-02-03T00:00:00.000Z"),
        likeCount: 1,
        post: { id: "post-1", title: "Ridge Day", slug: "ridge-day" },
      },
    ]);
    vi.mocked(countCommentsByUserId).mockResolvedValue(24);

    const markup = renderToStaticMarkup(await AuthorProfilePage({ params: Promise.resolve({ id: "user-1" }) }));

    expect(markup).toContain("24");
    expect(markup).toContain("3");
    expect(markup).toContain("Ridge Day");
    expect(markup).toContain('href="/posts/ridge-day"');
    expect(markup).toContain("↩ Reply");
    expect(markup).toContain("♥ 2 likes");
    expect(markup).toContain("Showing 20 most recent of 24 comments");
  });

  it("notFounds when the public author profile does not exist", async () => {
    vi.mocked(getPublicAuthorProfileById).mockResolvedValue(null);
    vi.mocked(listCommentsByUserId).mockResolvedValue([]);
    vi.mocked(countCommentsByUserId).mockResolvedValue(0);

    await expect(AuthorProfilePage({ params: Promise.resolve({ id: "missing-user" }) })).rejects.toThrow(notFoundError);
    expect(notFound).toHaveBeenCalled();
  });
});
