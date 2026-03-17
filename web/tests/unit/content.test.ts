import { describe, expect, it } from "vitest";

import { htmlToPlainText, processHeadings, renderTiptapJson } from "@/lib/content";

describe("htmlToPlainText", () => {
  it("strips HTML tags", () => {
    expect(htmlToPlainText("<p>Hello world</p>")).toBe("Hello world");
  });

  it("collapses whitespace", () => {
    expect(htmlToPlainText("<p>Hello</p><p>World</p>")).toBe("Hello World");
  });

  it("handles null input gracefully", () => {
    // sanitizeRichTextHtml returns a placeholder for null/empty
    const result = htmlToPlainText(null);
    expect(result).toBeTruthy();
    expect(typeof result).toBe("string");
  });

  it("handles empty string", () => {
    const result = htmlToPlainText("");
    expect(typeof result).toBe("string");
  });

  it("strips nested tags", () => {
    expect(htmlToPlainText("<p><strong>Bold</strong> and <em>italic</em></p>")).toBe("Bold and italic");
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
