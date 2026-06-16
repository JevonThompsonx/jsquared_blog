import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/components/layout/site-header", () => ({
  SiteHeader: () => createElement("div", { "data-testid": "site-header" }, "Header shell"),
}));

import AccessibilityPage, { metadata } from "@/app/(blog)/accessibility/page";

describe("AccessibilityPage", () => {
  it("exposes stable accessibility metadata", () => {
    expect(metadata.title).toBe("Accessibility — J²Adventures");
  });

  it("renders the page header and accessibility commitment", () => {
    const markup = renderToStaticMarkup(AccessibilityPage());
    expect(markup).toContain("Accessibility");
    expect(markup).toMatch(/commitment|accessible/i);
  });

  it("lists the major accessibility features we ship with", () => {
    const markup = renderToStaticMarkup(AccessibilityPage());

    // Skip link to main content
    expect(markup).toMatch(/skip[- ]?link/i);
    // ARIA labels
    expect(markup).toMatch(/aria[- ]?labels?/i);
    // Keyboard navigation
    expect(markup).toMatch(/keyboard/i);
  });

  it("provides a contact method for accessibility issues", () => {
    const markup = renderToStaticMarkup(AccessibilityPage());
    // Either a mailto: link or a contact form reference
    const hasMailto = /mailto:[^"\s]+/i.test(markup);
    const hasContactSection = /contact|reach out|get in touch|report/i.test(markup);
    expect(hasMailto || hasContactSection).toBe(true);
  });

  it("uses semantic landmarks (h1, h2, sections)", () => {
    const markup = renderToStaticMarkup(AccessibilityPage());
    expect(markup).toMatch(/<h1[\s>]/);
    expect(markup).toMatch(/<h2[\s>]/);
  });
});
