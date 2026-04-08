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

vi.mock("@/components/blog/post-date", () => ({
  PostDate: ({ dateString }: { dateString: string }) => createElement("time", { "data-testid": "post-date", dateTime: dateString }, dateString),
}));

vi.mock("@/server/dal/series", () => ({
  getSeriesBySlug: vi.fn(),
  listPublishedPostsInSeries: vi.fn(),
}));

import SeriesPage, { dynamic, generateMetadata } from "@/app/(blog)/series/[slug]/page";
import { getSeriesBySlug, listPublishedPostsInSeries } from "@/server/dal/series";
import { notFound } from "next/navigation";

const seriesRecord = {
  id: "series-1",
  title: "Pacific Northwest",
  slug: "pacific-northwest",
  description: "A rainy-road-trip run.",
};

describe("SeriesPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("keeps the route dynamic and builds series metadata", async () => {
    vi.mocked(getSeriesBySlug).mockResolvedValue(seriesRecord);

    const metadata = await generateMetadata({ params: Promise.resolve({ slug: "pacific-northwest" }) });

    expect(dynamic).toBe("force-dynamic");
    expect(metadata.title).toBe("Pacific Northwest");
    expect(metadata.description).toBe("A rainy-road-trip run.");
  });

  it("renders the empty-state shell when the series has no published posts", async () => {
    vi.mocked(getSeriesBySlug).mockResolvedValue(seriesRecord);
    vi.mocked(listPublishedPostsInSeries).mockResolvedValue([]);

    const markup = renderToStaticMarkup(await SeriesPage({ params: Promise.resolve({ slug: "pacific-northwest" }) }));

    expect(getSeriesBySlug).toHaveBeenCalledWith("pacific-northwest");
    expect(listPublishedPostsInSeries).toHaveBeenCalledWith("series-1");
    expect(markup).toContain('data-testid="site-header"');
    expect(markup).toContain("Pacific Northwest");
    expect(markup).toContain("0 parts");
    expect(markup).toContain("No published posts yet");
    expect(markup).toContain('href="/"');
  });

  it("notFounds when the series does not exist", async () => {
    vi.mocked(getSeriesBySlug).mockResolvedValue(null);

    await expect(SeriesPage({ params: Promise.resolve({ slug: "missing-series" }) })).rejects.toThrow(notFoundError);
    expect(notFound).toHaveBeenCalled();
  });

  it("fails closed on whitespace-only series slugs before series lookup", async () => {
    await expect(SeriesPage({ params: Promise.resolve({ slug: "   " }) })).rejects.toThrow(notFoundError);

    expect(notFound).toHaveBeenCalled();
    expect(getSeriesBySlug).not.toHaveBeenCalled();
    expect(listPublishedPostsInSeries).not.toHaveBeenCalled();
  });

  it("trims valid series slugs before metadata and page lookups", async () => {
    vi.mocked(getSeriesBySlug).mockResolvedValue(seriesRecord);
    vi.mocked(listPublishedPostsInSeries).mockResolvedValue([]);

    const metadata = await generateMetadata({ params: Promise.resolve({ slug: "  pacific-northwest  " }) });
    const markup = renderToStaticMarkup(await SeriesPage({ params: Promise.resolve({ slug: "  pacific-northwest  " }) }));

    expect(metadata.title).toBe("Pacific Northwest");
    expect(getSeriesBySlug).toHaveBeenNthCalledWith(1, "pacific-northwest");
    expect(getSeriesBySlug).toHaveBeenNthCalledWith(2, "pacific-northwest");
    expect(listPublishedPostsInSeries).toHaveBeenCalledWith("series-1");
    expect(markup).toContain("Pacific Northwest");
  });

  it("renders the populated series list with part numbers and post links", async () => {
    vi.mocked(getSeriesBySlug).mockResolvedValue(seriesRecord);
    vi.mocked(listPublishedPostsInSeries).mockResolvedValue([
      {
        id: "post-1",
        title: "Rainy Start",
        slug: "rainy-start",
        excerpt: "The first leg of the trip.",
        imageUrl: "https://example.com/rainy-start.jpg",
        seriesOrder: 2,
        publishedAt: new Date("2024-01-02T00:00:00.000Z"),
        createdAt: new Date("2024-01-01T00:00:00.000Z"),
      },
    ]);

    const markup = renderToStaticMarkup(await SeriesPage({ params: Promise.resolve({ slug: "pacific-northwest" }) }));

    expect(markup).toContain("1 part");
    expect(markup).toContain("Rainy Start");
    expect(markup).toContain('href="/posts/rainy-start"');
    expect(markup).toContain('data-testid="post-date"');
    expect(markup).toContain('src="https://example.com/rainy-start.jpg"');
    expect(markup).toContain(">2<");
  });
});
