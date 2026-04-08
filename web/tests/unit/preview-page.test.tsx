import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";

const notFoundError = new Error("NEXT_NOT_FOUND");

vi.mock("next/navigation", () => ({
  notFound: vi.fn(() => {
    throw notFoundError;
  }),
}));

vi.mock("@/components/layout/site-header", () => ({
  SiteHeader: () => createElement("div", { "data-testid": "site-header" }, "Header"),
}));

vi.mock("@/components/blog/author-card", () => ({
  AuthorCard: () => createElement("div", { "data-testid": "author-card" }, "Author card"),
}));

vi.mock("@/components/blog/post-gallery", () => ({
  PostGallery: () => createElement("div", { "data-testid": "post-gallery" }, "Gallery"),
}));

vi.mock("@/components/blog/post-map", () => ({
  PostMap: () => createElement("div", { "data-testid": "post-map" }, "Map"),
}));

vi.mock("@/components/blog/post-song-metadata", () => ({
  PostSongMetadata: () => createElement("div", { "data-testid": "song-metadata" }, "Song metadata"),
}));

vi.mock("@/components/blog/prose-content", () => ({
  ProseContent: ({ html }: { html: string }) => createElement("div", { "data-testid": "prose-content" }, html),
}));

vi.mock("@/components/blog/reading-progress-bar", () => ({
  ReadingProgressBar: () => createElement("div", { "data-testid": "reading-progress" }, "Reading progress"),
}));

vi.mock("@/components/blog/series-nav", () => ({
  SeriesNav: () => createElement("div", { "data-testid": "series-nav" }, "Series nav"),
}));

vi.mock("@/components/blog/table-of-contents", () => ({
  TableOfContents: () => createElement("div", { "data-testid": "table-of-contents" }, "TOC"),
}));

vi.mock("@/components/blog/post-date", () => ({
  PostDate: ({ dateString }: { dateString: string }) => createElement("time", { dateTime: dateString }, dateString),
}));

vi.mock("@/lib/content", () => ({
  sanitizeRichTextHtml: vi.fn((html: string) => html),
  processHeadings: vi.fn((html: string) => ({ html, headings: [] })),
}));

vi.mock("@/lib/auth/session", () => ({
  requireAdminSession: vi.fn(),
}));

vi.mock("@/lib/env", () => ({
  getPublicEnv: vi.fn(() => ({ NEXT_PUBLIC_STADIA_MAPS_API_KEY: undefined })),
}));

vi.mock("@/lib/utils", () => ({
  getCategoryHref: vi.fn((category: string) => `/category/${category}`),
  getTagHref: vi.fn((slug: string) => `/tag/${slug}`),
}));

vi.mock("@/server/dal/series", () => ({
  getSeriesNavForPost: vi.fn(),
}));

vi.mock("@/server/dal/profiles", () => ({
  getPublicAuthorProfileById: vi.fn(),
}));

vi.mock("@/server/posts/preview", () => ({
  validatePostPreviewToken: vi.fn(),
}));

vi.mock("@/server/queries/posts", () => ({
  getPostForPreview: vi.fn(),
}));

import PreviewPage from "@/app/(blog)/preview/[id]/page";
import { requireAdminSession } from "@/lib/auth/session";
import { getPublicAuthorProfileById } from "@/server/dal/profiles";
import { getSeriesNavForPost } from "@/server/dal/series";
import { validatePostPreviewToken } from "@/server/posts/preview";
import { getPostForPreview } from "@/server/queries/posts";
import { notFound } from "next/navigation";

const previewPost = {
  id: "post-123",
  slug: "preview-story",
  title: "Preview Story",
  description: "<p>Hello from preview</p>",
  excerpt: "Preview excerpt",
  imageUrl: null,
  category: "Travel",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-02T00:00:00.000Z",
  publishedAt: null,
  status: "draft" as const,
  layoutType: "standard" as const,
  tags: [{ id: "tag-1", name: "Preview", slug: "preview" }],
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
  authorId: "author-1",
  readingTimeMinutes: 4,
};

describe("PreviewPage", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("fails closed on whitespace-only preview ids before hitting downstream helpers", async () => {
    vi.mocked(requireAdminSession).mockResolvedValue(null);

    await expect(
      PreviewPage({
        params: Promise.resolve({ id: "   " }),
        searchParams: Promise.resolve({ token: "preview-token" }),
      }),
    ).rejects.toThrow(notFoundError);

    expect(validatePostPreviewToken).not.toHaveBeenCalled();
    expect(getPostForPreview).not.toHaveBeenCalled();
    expect(notFound).toHaveBeenCalled();
  });

  it("trims a valid preview id and token for guest preview access", async () => {
    vi.mocked(requireAdminSession).mockResolvedValue(null);
    vi.mocked(validatePostPreviewToken).mockResolvedValue(true);
    vi.mocked(getPostForPreview).mockResolvedValue(previewPost);
    vi.mocked(getSeriesNavForPost).mockResolvedValue(null);
    vi.mocked(getPublicAuthorProfileById).mockResolvedValue(null);

    const markup = renderToStaticMarkup(
      await PreviewPage({
        params: Promise.resolve({ id: "  post-123  " }),
        searchParams: Promise.resolve({ token: "  preview-token  " }),
      }),
    );

    expect(validatePostPreviewToken).toHaveBeenCalledWith("post-123", "preview-token");
    expect(getPostForPreview).toHaveBeenCalledWith("post-123");
    expect(markup).toContain("Preview Mode");
    expect(markup).toContain("Preview Story");
  });
});
