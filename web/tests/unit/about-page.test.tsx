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

  it("renders a social-links section with at least Instagram and YouTube", () => {
    const markup = renderToStaticMarkup(AboutPage());
    expect(markup).toMatch(/Find us/i);
    expect(markup).toContain("Instagram");
    expect(markup).toContain("YouTube");
  });

  it("renders social links with accessible labels and external link attributes", () => {
    const markup = renderToStaticMarkup(AboutPage());

    // Instagram — anchored in heading
    expect(markup).toMatch(/aria-label="[^"]*Instagram[^"]*"/i);
    // YouTube — anchored in heading
    expect(markup).toMatch(/aria-label="[^"]*YouTube[^"]*"/i);

    // External links open in new tab with safe rel
    const externalMatches = markup.match(/target="_blank"/g) ?? [];
    expect(externalMatches.length).toBeGreaterThanOrEqual(2);
    expect(markup).toContain('rel="noopener noreferrer"');
  });

  it("groups social links under a labelled landmark", () => {
    const markup = renderToStaticMarkup(AboutPage());

    // Social block uses nav with aria-label
    const socialNavMatch = markup.match(/<nav[^>]*aria-label="[^"]*[sS]ocial[^"]*"[^>]*>/);
    expect(socialNavMatch).toBeTruthy();
  });
});
