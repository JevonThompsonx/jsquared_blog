import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const globalsCssPath = resolve(__dirname, "../../src/app/globals.css");
const globalsCss = readFileSync(globalsCssPath, "utf8");

function getPrintBlock(css: string): string {
  const start = css.indexOf("@media print");
  if (start === -1) return "";
  let depth = 0;
  let i = start;
  while (i < css.length) {
    const ch = css[i];
    if (ch === "{") depth += 1;
    else if (ch === "}") {
      depth -= 1;
      if (depth === 0) return css.slice(start, i + 1);
    }
    i += 1;
  }
  return "";
}

describe("globals.css print styles", () => {
  const printBlock = getPrintBlock(globalsCss);

  it("defines a @media print block", () => {
    expect(printBlock.length).toBeGreaterThan(0);
  });

  it.each([
    ["header"],
    ["nav"],
    ["footer"],
  ])("hides %s in print", (selector) => {
    expect(printBlock).toContain(selector);
    expect(printBlock).toMatch(/display\s*:\s*none\s*!important/);
  });

  it("hides data-print-hide elements in print", () => {
    expect(printBlock).toMatch(/\[data-print-hide\][^{]*\{[^}]*display\s*:\s*none/);
  });

  it("hides the newsletter signup form in print", () => {
    const newsletterSelector = /newsletter-signup-form|\.newsletter-form|data-newsletter/i;
    const displayNoneRule = /display\s*:\s*none\s*!important/;
    expect(printBlock).toMatch(newsletterSelector);
    expect(printBlock).toMatch(displayNoneRule);
  });

  it("hides the comments section in print", () => {
    const commentSelector = /comments|\.comments-section|data-comments/i;
    const displayNoneRule = /display\s*:\s*none\s*!important/;
    expect(printBlock).toMatch(commentSelector);
    expect(printBlock).toMatch(displayNoneRule);
  });

  it("hides the share buttons in print", () => {
    const shareSelector = /share-buttons|\.share-buttons|\[aria-label="Share/i;
    const displayNoneRule = /display\s*:\s*none\s*!important/;
    expect(printBlock).toMatch(shareSelector);
    expect(printBlock).toMatch(displayNoneRule);
  });

  it("keeps post content, author, and date visible (no rules targeting .prose-content with display: none)", () => {
    expect(printBlock).not.toMatch(/\.prose-content\s*\{[^}]*display\s*:\s*none/);
    expect(printBlock).not.toMatch(/article\s*\{[^}]*display\s*:\s*none/);
  });

  it("uses !important to defeat specificity from component styles", () => {
    const importantDisplayNoneCount = (printBlock.match(/display\s*:\s*none\s*!important/g) ?? []).length;
    expect(importantDisplayNoneCount).toBeGreaterThanOrEqual(1);
    // Verify the hide list includes both structural and component selectors
    expect(printBlock).toContain("header");
    expect(printBlock).toContain("nav");
    expect(printBlock).toContain("footer");
  });

  it.each([
    ["header button"],
    ["nav button"],
    ["footer button"],
  ])("hides %s in print (scoped, not global)", (selector) => {
    expect(printBlock).toContain(selector);
  });

  it("does not hide article-content buttons via a global selector", () => {
    // The previous blanket rule `button:not([data-print-show])` would hide
    // every button on the page, including image-zoom buttons in the post
    // gallery. The fix scopes button-hiding to header/nav/footer only.
    // Extract selector lists (text before each `{`) and check that no list
    // starts with the bare `button` selector (it should always be prefixed
    // by a parent like `header`, `nav`, or `footer`).
    const selectorLists = printBlock
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .split("}")
      .map((chunk) => chunk.split("{")[0]?.trim() ?? "")
      .filter((list) => list.length > 0);

    for (const selectorList of selectorLists) {
      const selectors = selectorList.split(",").map((s) => s.trim());
      for (const selector of selectors) {
        expect(selector, `selector "${selector}" hides article-content buttons globally`).not.toMatch(
          /^button\s*:\s*not\(\[data-print-show\]\)$/,
        );
      }
    }
  });

  it("preserves [data-print-show] as an opt-in for showing a button in chrome areas", () => {
    // The data-print-show attribute remains a valid escape hatch: any button
    // marked with it in header/nav/footer should be shown. (CSS allows the
    // attribute to override the scoped hide rule via specificity.)
    expect(printBlock).toMatch(/\[data-print-show\]/);
  });

  it("does not target article-content elements for hiding", () => {
    // No rule should match `article button`, `.prose-content button`, or
    // any post-body selector with `display: none`.
    expect(printBlock).not.toMatch(/article\s+button\s*\{[^}]*display\s*:\s*none/);
    expect(printBlock).not.toMatch(/\.prose-content\s+button\s*\{[^}]*display\s*:\s*none/);
  });
});
