import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/image", () => ({
  default: ({ alt, src, sizes }: { alt: string; src: string; sizes?: string }) =>
    createElement("img", { alt, src, sizes }),
}));

vi.mock("@/components/layout/site-header", () => ({
  SiteHeader: () => createElement("div", { "data-testid": "site-header" }, "Header shell"),
}));

import AboutPage, { metadata } from "@/app/(blog)/about/page";

describe("AboutPage", () => {
  it("exposes stable about metadata", () => {
    expect(metadata.title).toBe("About — J²Adventures");
    expect(metadata.description).toContain("J’s behind J²Adventures");
  });

  it("renders the public about-page shell and CTA links", () => {
    const markup = renderToStaticMarkup(AboutPage());

    expect(markup).toContain('data-testid="site-header"');
    expect(markup).toContain("The story behind J²");
    expect(markup).toContain("Read the adventures.");
    expect(markup).toContain('href="/"');
    expect(markup).toContain('href="/signup"');
  });

  it("provides responsive sizes for every fill image", () => {
    const markup = renderToStaticMarkup(AboutPage());

    expect(markup).toContain('alt="Jevon and Jessica"');
    expect(markup).toContain('alt="Jevon"');
    expect(markup).toContain('alt="Jessica"');
    expect(markup).toContain('alt="Hiking"');
    expect(markup).toContain('alt="Van / camping"');
    expect(markup).toContain('alt="Travel"');
    expect(markup).toContain('sizes=');
  });
});
