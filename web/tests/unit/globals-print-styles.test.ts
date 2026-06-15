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
    expect(printBlock).toContain("button:not([data-print-show])");
  });
});
