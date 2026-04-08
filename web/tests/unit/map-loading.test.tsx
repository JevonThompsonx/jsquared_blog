import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/components/layout/site-header", () => ({
  SiteHeader: () => createElement("div", { "data-testid": "site-header" }, "Header shell"),
}));

import MapLoading from "@/app/(blog)/map/loading";

describe("MapLoading", () => {
  it("renders the map loading skeleton shell", () => {
    const markup = renderToStaticMarkup(MapLoading());

    expect(markup).toContain('data-testid="site-header"');
    expect(markup).toContain("animate-pulse");
    expect(markup).toContain("aspect-video");
    expect(markup).toContain("rounded-full");
  });
});
