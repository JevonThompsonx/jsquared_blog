import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/components/layout/site-header", () => ({
  SiteHeader: () => createElement("div", { "data-testid": "site-header" }, "Header shell"),
}));

import PostLoading from "@/app/(blog)/posts/[slug]/loading";

describe("PostLoading", () => {
  it("renders the post-detail loading skeleton shell", () => {
    const markup = renderToStaticMarkup(PostLoading());

    expect(markup).toContain('data-testid="site-header"');
    expect(markup).toContain("animate-pulse");
    expect(markup).toContain("aspect-[5/3]");
    expect(markup).toContain("max-w-[68ch]");
  });
});
