import { createElement } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

const notFoundError = new Error("NEXT_NOT_FOUND");

vi.mock("next/navigation", () => ({
  notFound: vi.fn(() => {
    throw notFoundError;
  }),
}));

vi.mock("next/image", () => ({
  default: ({ alt, src, ...props }: React.ImgHTMLAttributes<HTMLImageElement>) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img alt={alt} src={src} {...props} />
  ),
}));

vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a href={typeof href === "string" ? href : "#"} {...props}>{children}</a>
  ),
}));

vi.mock("@/components/blog/author-card", () => ({
  AuthorCard: () => createElement("div", { "data-testid": "author-card" }, "Author"),
}));

vi.mock("@/components/blog/bookmark-button", () => ({
  BookmarkButton: () => createElement("button", { "data-testid": "bookmark-button" }, "Bookmark"),
}));

vi.mock("@/components/blog/comments", () => ({
  Comments: () => createElement("div", { "data-testid": "comments" }, "Comments"),
}));

vi.mock("@/components/blog/copy-link-button", () => ({
  CopyLinkButton: () => createElement("button", { "data-testid": "copy-link-button" }, "Copy"),
}));

vi.mock("@/components/blog/share-buttons", () => ({
  ShareButtons: () => createElement("div", { "data-testid": "share-buttons" }, "Share"),
}));

vi.mock("@/components/blog/post-gallery", () => ({
  PostGallery: () => createElement("div", { "data-testid": "post-gallery" }, "Gallery"),
}));

vi.mock("@/components/blog/post-map", () => ({
  PostMap: () => createElement("div", { "data-testid": "post-map" }, "Map"),
}));

vi.mock("@/components/blog/post-song-metadata", () => ({
  PostSongMetadata: () => createElement("div", { "data-testid": "post-song-metadata" }, "Song"),
}));

vi.mock("@/components/blog/prose-content", () => ({
  ProseContent: ({ html }: { html: string }) => createElement("div", { "data-testid": "prose-content" }, html),
}));

vi.mock("@/components/blog/reading-progress-bar", () => ({
  ReadingProgressBar: () => createElement("div", { "data-testid": "reading-progress-bar" }, "Progress"),
}));

vi.mock("@/components/blog/post-view-tracker", () => ({
  PostViewTracker: () => createElement("div", { "data-testid": "post-view-tracker" }, "Tracker"),
}));

vi.mock("@/components/layout/site-header", () => ({
  SiteHeader: () => createElement("div", { "data-testid": "site-header" }, "Header"),
}));

vi.mock("@/components/blog/table-of-contents", () => ({
  TableOfContents: () => createElement("div", { "data-testid": "table-of-contents" }, "TOC"),
}));

vi.mock("@/components/blog/post-date", () => ({
  PostDate: ({ dateString }: { dateString: string }) => createElement("time", { dateTime: dateString }, dateString),
}));

vi.mock("@/components/blog/series-nav", () => ({
  SeriesNav: () => createElement("div", { "data-testid": "series-nav" }, "Series"),
}));

vi.mock("@/lib/content", () => ({
  htmlToPlainText: vi.fn((html: string) => html.replace(/<[^>]+>/g, "")),
  processHeadings: vi.fn((html: string) => ({ html, headings: [] })),
  sanitizeRichTextHtml: vi.fn((html: string) => html),
}));

vi.mock("@/lib/utils", () => ({
  getCanonicalPostUrl: vi.fn((post: { slug: string }) => `https://jsquaredadventures.com/posts/${post.slug}`),
  getCategoryHref: vi.fn((category: string) => `/category/${category}`),
  getTagHref: vi.fn((slug: string) => `/tag/${slug}`),
  getPostHref: vi.fn((post: { slug: string }) => `/posts/${post.slug}`),
}));

vi.mock("@/lib/auth/session", () => ({
  getAdminServerSession: vi.fn(),
}));

vi.mock("@/lib/env", () => ({
  getPublicEnv: vi.fn(() => ({ NEXT_PUBLIC_STADIA_MAPS_API_KEY: undefined })),
}));

vi.mock("@/server/queries/posts", () => ({
  getPublishedPostBySlug: vi.fn(),
  getRelatedPosts: vi.fn(),
}));

vi.mock("@/server/dal/series", () => ({
  getSeriesNavForPost: vi.fn(),
}));

vi.mock("@/server/dal/profiles", () => ({
  getPublicAuthorProfileById: vi.fn(),
}));

vi.mock("@/app/(blog)/posts/[slug]/head", () => ({
  default: () => createElement("div", { "data-testid": "post-head" }, "Head"),
}));

import PostPage, { generateMetadata } from "@/app/(blog)/posts/[slug]/page";
import { getAdminServerSession } from "@/lib/auth/session";
import { getPublishedPostBySlug, getRelatedPosts } from "@/server/queries/posts";
import { notFound } from "next/navigation";

const publishedPost = {
  id: "post-1",
  slug: "desert-sunrise",
  title: "Desert Sunrise",
  description: "<p>Morning light over the dunes.</p>",
  excerpt: "<p>Morning light over the dunes.</p>",
  imageUrl: null,
  category: "Travel",
  createdAt: "2026-03-01T10:00:00.000Z",
  updatedAt: "2026-03-02T11:00:00.000Z",
  publishedAt: "2026-03-01T12:00:00.000Z",
  status: "published" as const,
  layoutType: "standard" as const,
  tags: [],
  images: [],
  source: "turso" as const,
  locationName: null,
  locationLat: null,
  locationLng: null,
  locationZoom: null,
  iovanderUrl: null,
  song: null,
  viewCount: 0,
  commentCount: 0,
  authorId: undefined,
  readingTimeMinutes: 5,
};

describe("PostPage slug validation", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("fails closed on whitespace-only slugs before hitting post lookup or session reads", async () => {
    await expect(PostPage({ params: Promise.resolve({ slug: "   " }) })).rejects.toThrow(notFoundError);

    expect(getPublishedPostBySlug).not.toHaveBeenCalled();
    expect(getAdminServerSession).not.toHaveBeenCalled();
    expect(notFound).toHaveBeenCalled();
  });

  it("trims valid slugs before querying metadata", async () => {
    vi.mocked(getPublishedPostBySlug).mockResolvedValue(publishedPost);

    const metadata = await generateMetadata({ params: Promise.resolve({ slug: "  desert-sunrise  " }) });

    expect(getPublishedPostBySlug).toHaveBeenCalledWith("desert-sunrise");
    expect(metadata.title).toBe("Desert Sunrise");
  });

  it("returns null from JSON-LD head on whitespace-only slugs without hitting post lookup", async () => {
    const { default: Head } = await vi.importActual<typeof import("@/app/(blog)/posts/[slug]/head")>("@/app/(blog)/posts/[slug]/head");

    const element = await Head({ params: Promise.resolve({ slug: "   " }) });

    expect(element).toBeNull();
    expect(getPublishedPostBySlug).not.toHaveBeenCalled();
  });

  it("trims valid slugs before rendering the page lookup", async () => {
    vi.mocked(getPublishedPostBySlug).mockResolvedValue(null);
    vi.mocked(getAdminServerSession).mockResolvedValue(null);
    vi.mocked(getRelatedPosts).mockResolvedValue([]);

    await expect(PostPage({ params: Promise.resolve({ slug: "  desert-sunrise  " }) })).rejects.toThrow(notFoundError);

    expect(getPublishedPostBySlug).toHaveBeenCalledWith("desert-sunrise");
  });
});
