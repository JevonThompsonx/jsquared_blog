// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a href={typeof href === "string" ? href : "#"} {...props}>{children}</a>
  ),
}));

vi.mock("@/components/blog/newsletter-signup-form", () => ({
  NewsletterSignupForm: () => <form data-testid="newsletter-form" />,
}));

import { SiteFooter } from "@/components/layout/site-footer";

describe("SiteFooter", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  function render() {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    act(() => {
      root.render(<SiteFooter />);
    });
  }

  it("renders the site brand and tagline", () => {
    render();
    expect(container.textContent).toContain("J²Adventures");
    expect(container.textContent).toContain("Travel stories, maps, and photo-led field notes");
  });

  it("renders navigation links to public pages", () => {
    render();
    const hrefs = Array.from(container.querySelectorAll("a")).map((a) => a.getAttribute("href"));
    expect(hrefs).toContain("/");
    expect(hrefs).toContain("/map");
    expect(hrefs).toContain("/about");
    expect(hrefs).toContain("/wishlist");
  });

  it("renders discovery links to taxonomy and feed", () => {
    render();
    const hrefs = Array.from(container.querySelectorAll("a")).map((a) => a.getAttribute("href"));
    expect(hrefs).toContain("/tags");
    expect(hrefs).toContain("/categories");
    expect(hrefs).toContain("/series");
    expect(hrefs).toContain("/feed.xml");
  });

  it("renders the newsletter signup form with the 'Stay on the trail' heading", () => {
    render();
    expect(container.textContent).toContain("Stay on the trail");
    expect(container.textContent).toContain("Get notified when we post new stories");
    expect(container.querySelector("[data-testid='newsletter-form']")).toBeTruthy();
  });

  it("renders a back-to-top link that anchors to main content", () => {
    render();
    const backToTop = container.querySelector('a[href="#main-content"]');
    expect(backToTop).toBeTruthy();
    expect(backToTop?.textContent).toContain("Back to top");
  });

  it("renders the current year in the copyright line", () => {
    render();
    const year = new Date().getFullYear();
    expect(container.textContent).toContain(String(year));
    expect(container.textContent).not.toContain("All rights reserved");
  });

  it("uses an accessible footer landmark", () => {
    render();
    const footer = container.querySelector("footer");
    expect(footer?.getAttribute("aria-label")).toBe("Site footer");
  });

  it("exposes an accessibility statement link in the footer", () => {
    render();
    const hrefs = Array.from(container.querySelectorAll("a")).map((a) => a.getAttribute("href"));
    expect(hrefs).toContain("/accessibility");
    const accessibilityLink = container.querySelector('a[href="/accessibility"]');
    expect(accessibilityLink?.textContent?.toLowerCase()).toContain("accessibility");
  });
});
