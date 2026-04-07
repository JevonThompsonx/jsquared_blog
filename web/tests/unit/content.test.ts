import { describe, expect, it } from "vitest";

import {
  getReadingTimeMinutes,
  getWordCount,
  htmlToPlainText,
  processHeadings,
  renderTiptapJson,
  sanitizeRichTextHtml,
} from "@/lib/content";

describe("htmlToPlainText", () => {
  it("strips HTML tags", () => {
    expect(htmlToPlainText("<p>Hello world</p>")).toBe("Hello world");
  });

  it("collapses whitespace", () => {
    expect(htmlToPlainText("<p>Hello</p><p>World</p>")).toBe("Hello World");
  });

  it("handles null input gracefully", () => {
    expect(htmlToPlainText(null)).toBe("");
  });

  it("handles empty string", () => {
    expect(htmlToPlainText("")).toBe("");
  });

  it("strips nested tags", () => {
    expect(htmlToPlainText("<p><strong>Bold</strong> and <em>italic</em></p>")).toBe("Bold and italic");
  });
});

describe("reading helpers", () => {
  it("counts words from sanitized html", () => {
    expect(getWordCount("<p>Hello <strong>road trip</strong> crew</p>")).toBe(4);
  });

  it("returns zero minutes for empty content", () => {
    expect(getReadingTimeMinutes("")).toBe(0);
  });

  it("rounds reading time up", () => {
    const content = `<p>${Array.from({ length: 221 }, () => "trail").join(" ")}</p>`;
    expect(getReadingTimeMinutes(content)).toBe(2);
  });
});

describe("renderTiptapJson", () => {
  it("returns null for null input", () => {
    expect(renderTiptapJson(null)).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(renderTiptapJson("")).toBeNull();
  });

  it("renders a simple paragraph node", () => {
    const json = JSON.stringify({
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "Hello world" }],
        },
      ],
    });
    const result = renderTiptapJson(json);
    expect(result).toContain("Hello world");
    expect(result).toContain("<p>");
  });

  it("renders bold text", () => {
    const json = JSON.stringify({
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "Bold text",
              marks: [{ type: "bold" }],
            },
          ],
        },
      ],
    });
    const result = renderTiptapJson(json);
    expect(result).toContain("<strong>Bold text</strong>");
  });

  it("renders headings at the correct level", () => {
    const json = JSON.stringify({
      type: "doc",
      content: [
        {
          type: "heading",
          attrs: { level: 2 },
          content: [{ type: "text", text: "Section title" }],
        },
      ],
    });
    const result = renderTiptapJson(json);
    expect(result).toContain("<h2>");
    expect(result).toContain("Section title");
  });

  it("renders a legacy-html payload via sanitization", () => {
    const json = JSON.stringify({ type: "legacy-html", html: "<p>Old content</p>" });
    const result = renderTiptapJson(json);
    expect(result).toContain("Old content");
  });

  it("returns null for malformed JSON", () => {
    expect(renderTiptapJson("{not valid json")).toBeNull();
  });

  it("returns null when the root type is not doc", () => {
    expect(renderTiptapJson(JSON.stringify({ type: "paragraph" }))).toBeNull();
  });

  it("escapes HTML entities in text content", () => {
    const json = JSON.stringify({
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "<script>alert(1)</script>" }],
        },
      ],
    });
    const result = renderTiptapJson(json);
    expect(result).not.toContain("<script>");
  });

  it("renders a collapsible thoughts block from canonical tiptap json", () => {
    const json = JSON.stringify({
      type: "doc",
      content: [
        {
          type: "thoughtsBlock",
          attrs: { summary: "Post-trip thoughts" },
          content: [
            {
              type: "paragraph",
              content: [{ type: "text", text: "Pack lighter next time." }],
            },
          ],
        },
      ],
    });

    const result = renderTiptapJson(json);

    expect(result).toContain("<details>");
    expect(result).toContain("<summary>Post-trip thoughts</summary>");
    expect(result).toContain("<p>Pack lighter next time.</p>");
    expect(result).toContain("</details>");
  });

  it("escapes html inside thoughts block summary text", () => {
    const json = JSON.stringify({
      type: "doc",
      content: [
        {
          type: "thoughtsBlock",
          attrs: { summary: '<img src=x onerror=alert(1)>' },
          content: [
            {
              type: "paragraph",
              content: [{ type: "text", text: "Body" }],
            },
          ],
        },
      ],
    });

    const result = renderTiptapJson(json);

    expect(result).toContain("<summary>&lt;img src=x onerror=alert(1)&gt;</summary>");
    expect(result).not.toContain("<img src=x onerror=alert(1)>");
  });
});

describe("sanitizeRichTextHtml", () => {
  it("removes dangerous attributes that regex stripping misses", () => {
    const sanitized = sanitizeRichTextHtml(
      '<img src="https://example.com/road.jpg" alt="Road" srcset="https://example.com/road.jpg 1x, https://example.com/road-2x.jpg 2x" style="position:fixed" data-evil="1" />',
    );

    expect(sanitized).toContain('src="https://example.com/road.jpg"');
    expect(sanitized).toContain('alt="Road"');
    expect(sanitized).toContain('loading="lazy"');
    expect(sanitized).not.toContain("srcset=");
    expect(sanitized).not.toContain("style=");
    expect(sanitized).not.toContain("data-evil=");
  });

  it("drops unsafe nested content while preserving allowed markup", () => {
    const sanitized = sanitizeRichTextHtml(
      '<p>Trail <span style="color:red"><a href="https://example.com" onclick="alert(1)">guide</a></span><svg><script>alert(1)</script></svg></p>',
    );

    expect(sanitized).toBe('<p>Trail <a href="https://example.com" target="_blank" rel="noreferrer">guide</a></p>');
  });

  it("normalizes legacy html links to the safe allowlist", () => {
    const result = renderTiptapJson(
      JSON.stringify({
        type: "legacy-html",
        html: '<p><a href="mailto:hello@example.com" class="cta" target="_self">Email me</a></p>',
      }),
    );

    expect(result).toBe(
      '<p><a href="mailto:hello@example.com" target="_blank" rel="noreferrer">Email me</a></p>',
    );
  });

  it("sanitizes collapsible thoughts block markup while preserving safe details and summary tags", () => {
    const sanitized = sanitizeRichTextHtml(
      '<details open onclick="alert(1)" class="x"><summary data-evil="1">Thoughts</summary><p>Safe copy</p><script>alert(1)</script></details>',
    );

    expect(sanitized).toBe("<details><summary>Thoughts</summary><p>Safe copy</p></details>");
  });
});

describe("processHeadings", () => {
  it("adds id attributes to h2 headings", () => {
    const { html, headings } = processHeadings("<h2>My Section</h2>");
    expect(html).toContain('id="my-section"');
    expect(headings).toHaveLength(1);
    expect(headings[0]).toMatchObject({ id: "my-section", text: "My Section", level: 2 });
  });

  it("adds id attributes to h3 and h4 headings", () => {
    const { html, headings } = processHeadings("<h3>Sub</h3><h4>Deep</h4>");
    expect(headings).toHaveLength(2);
    expect(headings[0]?.level).toBe(3);
    expect(headings[1]?.level).toBe(4);
    expect(html).toContain('id="sub"');
    expect(html).toContain('id="deep"');
  });

  it("does not process h1 or h5 headings", () => {
    const { headings } = processHeadings("<h1>Title</h1><h5>Fine</h5>");
    expect(headings).toHaveLength(0);
  });

  it("deduplicates heading ids with a counter suffix", () => {
    const { headings } = processHeadings("<h2>Tips</h2><h2>Tips</h2>");
    expect(headings[0]?.id).toBe("tips");
    expect(headings[1]?.id).toBe("tips-1");
  });

  it("returns unchanged html and empty headings for plain text", () => {
    const input = "<p>Just a paragraph</p>";
    const { html, headings } = processHeadings(input);
    expect(html).toBe(input);
    expect(headings).toHaveLength(0);
  });
});
