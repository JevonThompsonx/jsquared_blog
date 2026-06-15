import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { children: unknown }) => (
    <a href={typeof href === "string" ? href : "#"} {...props}>{children}</a>
  ),
}));

vi.mock("@/components/layout/site-header", () => ({
  SiteHeader: () => createElement("div", { "data-testid": "site-header" }, "Header shell"),
}));

vi.mock("@/server/dal/taxonomy-browse", () => ({
  listAllTagsForBrowse: vi.fn(),
}));

import TagsPage, { dynamic } from "@/app/(blog)/tags/page";
import { listAllTagsForBrowse } from "@/server/dal/taxonomy-browse";

const sampleTags = [
  {
    id: "tag-1",
    name: "Backpacking",
    slug: "backpacking",
    description: "Multi-day hiking stories from the trail.",
    postCount: 5,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-02-01T00:00:00.000Z"),
  },
  {
    id: "tag-2",
    name: "Van Life",
    slug: "van-life",
    description: null,
    postCount: 1,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-02-01T00:00:00.000Z"),
  },
  {
    id: "tag-3",
    name: "Photography",
    slug: "photography",
    description: "Field notes on chasing the light.",
    postCount: 0,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-02-01T00:00:00.000Z"),
  },
];

describe("TagsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("keeps the route dynamic and renders the tag grid when tags exist", async () => {
    vi.mocked(listAllTagsForBrowse).mockResolvedValue(sampleTags);

    const markup = renderToStaticMarkup(await TagsPage());

    expect(dynamic).toBe("force-dynamic");
    expect(listAllTagsForBrowse).toHaveBeenCalledOnce();
    expect(markup).toContain('data-testid="site-header"');
    expect(markup).toContain("Explore by tag");
    expect(markup).toContain("3 tags");
    expect(markup).toContain("6 adventures total");
    expect(markup).toContain('data-testid="tags-grid"');
    expect(markup).toContain('data-tag-slug="backpacking"');
    expect(markup).toContain('data-tag-slug="van-life"');
    expect(markup).toContain('href="/tag/backpacking"');
    expect(markup).toContain('href="/tag/van-life"');
    expect(markup).toContain("Backpacking");
    expect(markup).toContain("Van Life");
    expect(markup).toContain("5 adventures");
    expect(markup).toContain("1 adventure");
    expect(markup).toContain("Multi-day hiking stories from the trail.");
    expect(markup).toContain("No description yet.");
  });

  it("renders the empty state when no tags are returned", async () => {
    vi.mocked(listAllTagsForBrowse).mockResolvedValue([]);

    const markup = renderToStaticMarkup(await TagsPage());

    expect(markup).toContain("No tags yet");
    expect(markup).toContain("Tags will appear here once adventures are published and labeled.");
    expect(markup).toContain('href="/"');
    expect(markup).not.toContain('data-testid="tags-grid"');
    expect(markup).toContain("0 tags");
  });

  it("uses singular labels when only one tag is returned", async () => {
    vi.mocked(listAllTagsForBrowse).mockResolvedValue([sampleTags[0]!]);

    const markup = renderToStaticMarkup(await TagsPage());

    expect(markup).toContain("1 tag");
    expect(markup).toContain("5 adventures total");
    expect(markup).toContain('data-testid="tags-grid"');
  });

  it("pluralizes the post count label correctly", async () => {
    vi.mocked(listAllTagsForBrowse).mockResolvedValue([sampleTags[1]!]);

    const markup = renderToStaticMarkup(await TagsPage());

    expect(markup).toContain("1 adventure");
    expect(markup).not.toContain("1 adventures");
  });
});
