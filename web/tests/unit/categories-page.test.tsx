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
  listAllCategoriesForBrowse: vi.fn(),
}));

import CategoriesPage, { dynamic } from "@/app/(blog)/categories/page";
import { listAllCategoriesForBrowse } from "@/server/dal/taxonomy-browse";

const sampleCategories = [
  {
    id: "cat-1",
    name: "Hiking",
    slug: "hiking",
    description: "Trail adventures and summit pushes.",
    postCount: 4,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-02-01T00:00:00.000Z"),
  },
  {
    id: "cat-2",
    name: "Van Life",
    slug: "van-life",
    description: null,
    postCount: 1,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-02-01T00:00:00.000Z"),
  },
  {
    id: "cat-3",
    name: "International",
    slug: "international",
    description: "Trips beyond the lower 48.",
    postCount: 0,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-02-01T00:00:00.000Z"),
  },
];

describe("CategoriesPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("keeps the route dynamic and renders the category grid when categories exist", async () => {
    vi.mocked(listAllCategoriesForBrowse).mockResolvedValue(sampleCategories);

    const markup = renderToStaticMarkup(await CategoriesPage());

    expect(dynamic).toBe("force-dynamic");
    expect(listAllCategoriesForBrowse).toHaveBeenCalledOnce();
    expect(markup).toContain('data-testid="site-header"');
    expect(markup).toContain("Explore by category");
    expect(markup).toContain("3 categories");
    expect(markup).toContain("5 adventures total");
    expect(markup).toContain('data-testid="categories-grid"');
    expect(markup).toContain('data-category-slug="hiking"');
    expect(markup).toContain('data-category-slug="van-life"');
    expect(markup).toContain('href="/category/hiking"');
    expect(markup).toContain('href="/category/van-life"');
    expect(markup).toContain("Hiking");
    expect(markup).toContain("Van Life");
    expect(markup).toContain("4 adventures");
    expect(markup).toContain("1 adventure");
    expect(markup).toContain("Trail adventures and summit pushes.");
    expect(markup).toContain("No description yet.");
  });

  it("renders the empty state when no categories are returned", async () => {
    vi.mocked(listAllCategoriesForBrowse).mockResolvedValue([]);

    const markup = renderToStaticMarkup(await CategoriesPage());

    expect(markup).toContain("No categories yet");
    expect(markup).toContain("Categories will appear here once adventures are published and grouped.");
    expect(markup).toContain('href="/"');
    expect(markup).not.toContain('data-testid="categories-grid"');
    expect(markup).toContain("0 categories");
  });

  it("uses singular labels when only one category is returned", async () => {
    vi.mocked(listAllCategoriesForBrowse).mockResolvedValue([sampleCategories[0]!]);

    const markup = renderToStaticMarkup(await CategoriesPage());

    expect(markup).toContain("1 category");
    expect(markup).toContain("4 adventures total");
    expect(markup).toContain('data-testid="categories-grid"');
  });

  it("pluralizes the post count label correctly", async () => {
    vi.mocked(listAllCategoriesForBrowse).mockResolvedValue([sampleCategories[1]!]);

    const markup = renderToStaticMarkup(await CategoriesPage());

    expect(markup).toContain("1 adventure");
    expect(markup).not.toContain("1 adventures");
  });
});
