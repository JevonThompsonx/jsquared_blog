import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  notFound: vi.fn(),
}));

vi.mock("next/image", () => ({
  default: ({ alt, src, ...props }: React.ImgHTMLAttributes<HTMLImageElement>) =>
    createElement("img", { alt, src, ...props }),
}));

vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a href={typeof href === "string" ? href : "#"} {...props}>
      {children}
    </a>
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
  PostDate: ({ dateString, className }: { dateString: string; className?: string }) =>
    createElement(
      "time",
      { className, dateTime: dateString, "data-testid": "post-date" },
      dateString,
    ),
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

import PostPage from "@/app/(blog)/posts/[slug]/page";
import { getPublishedPostBySlug, getRelatedPosts } from "@/server/queries/posts";
import { getSeriesNavForPost } from "@/server/dal/series";
import { getPublicAuthorProfileById } from "@/server/dal/profiles";
import { getAdminServerSession } from "@/lib/auth/session";

const basePost = {
  id: "post-1",
  slug: "desert-sunrise",
  title: "Desert Sunrise",
  description: "<p>Morning light over the dunes.</p>",
  excerpt: "<p>Morning light over the dunes.</p>",
  imageUrl: null as string | null,
  category: "Travel" as string | null,
  createdAt: "2026-03-01T10:00:00.000Z",
  updatedAt: "2026-03-02T11:00:00.000Z",
  publishedAt: "2026-03-01T12:00:00.000Z" as string | null,
  status: "published" as const,
  layoutType: "standard" as const,
  tags: [],
  images: [],
  source: "turso" as const,
  locationName: null as string | null,
  locationLat: null as number | null,
  locationLng: null as number | null,
  locationZoom: null as number | null,
  iovanderUrl: null as string | null,
  song: null,
  viewCount: 0,
  commentCount: 0,
  authorId: undefined,
  readingTimeMinutes: 5,
};

function makeRelatedPost(overrides: Partial<typeof basePost> = {}): typeof basePost {
  return {
    ...basePost,
    id: overrides.id ?? "related-1",
    slug: overrides.slug ?? "related-story",
    title: overrides.title ?? "Related Story",
    imageUrl: overrides.imageUrl ?? "https://cdn.example.com/related.jpg",
    createdAt: overrides.createdAt ?? "2026-04-15T08:00:00.000Z",
    publishedAt: overrides.publishedAt ?? "2026-04-15T09:00:00.000Z",
    readingTimeMinutes: overrides.readingTimeMinutes ?? 7,
    category: overrides.category ?? "Adventure",
  };
}

describe("PostPage related posts metadata", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("renders date and reading time on each related post card", async () => {
    vi.mocked(getPublishedPostBySlug).mockResolvedValue(basePost);
    vi.mocked(getRelatedPosts).mockResolvedValue([
      makeRelatedPost({ id: "r-1", slug: "first-related", title: "First Related" }),
      makeRelatedPost({ id: "r-2", slug: "second-related", title: "Second Related" }),
    ]);
    vi.mocked(getSeriesNavForPost).mockResolvedValue(null);
    vi.mocked(getPublicAuthorProfileById).mockResolvedValue(null);
    vi.mocked(getAdminServerSession).mockResolvedValue(null);

    const markup = renderToStaticMarkup(
      await PostPage({ params: Promise.resolve({ slug: "desert-sunrise" }) }),
    );

    const dateMatches = markup.match(/data-testid="post-date"/g) ?? [];
    expect(dateMatches.length).toBeGreaterThanOrEqual(2);

    expect(markup).toContain("7 min read");
    expect(markup).toContain('dateTime="2026-04-15T09:00:00.000Z"');
  });

  it("does not render the reading time label when related post has no reading time", async () => {
    vi.mocked(getPublishedPostBySlug).mockResolvedValue(basePost);
    vi.mocked(getRelatedPosts).mockResolvedValue([
      makeRelatedPost({ readingTimeMinutes: 0 }),
    ]);
    vi.mocked(getSeriesNavForPost).mockResolvedValue(null);
    vi.mocked(getPublicAuthorProfileById).mockResolvedValue(null);
    vi.mocked(getAdminServerSession).mockResolvedValue(null);

    const markup = renderToStaticMarkup(
      await PostPage({ params: Promise.resolve({ slug: "desert-sunrise" }) }),
    );

    expect(markup).toContain("Keep the trail going");
    expect(markup).not.toContain("0 min read");
  });
});
