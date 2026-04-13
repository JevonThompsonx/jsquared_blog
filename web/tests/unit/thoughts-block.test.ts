import { describe, expect, it } from "vitest";

import {
  DEFAULT_THOUGHTS_BLOCK_SUMMARY,
  THOUGHTS_BLOCK_NODE_NAME,
  ThoughtsBlock,
  createThoughtsBlockNode,
  normalizeThoughtsBlockSummary,
} from "@/lib/tiptap/thoughts-block";

describe("normalizeThoughtsBlockSummary", () => {
  it("returns the default summary for blank input", () => {
    expect(normalizeThoughtsBlockSummary("   ")).toBe(DEFAULT_THOUGHTS_BLOCK_SUMMARY);
  });

  it("trims surrounding whitespace", () => {
    expect(normalizeThoughtsBlockSummary("  Camp notes  ")).toBe("Camp notes");
  });
});

describe("createThoughtsBlockNode", () => {
  it("creates the canonical thoughts block node shape", () => {
    expect(createThoughtsBlockNode("Post-trip thoughts")).toEqual({
      type: "thoughtsBlock",
      attrs: { summary: "Post-trip thoughts" },
      content: [{ type: "paragraph" }],
    });
  });

  it("falls back to the default summary when needed", () => {
    expect(createThoughtsBlockNode(" ")).toEqual({
      type: "thoughtsBlock",
      attrs: { summary: DEFAULT_THOUGHTS_BLOCK_SUMMARY },
      content: [{ type: "paragraph" }],
    });
  });
});

describe("ThoughtsBlock extension", () => {
  it("registers the canonical node name", () => {
    expect(THOUGHTS_BLOCK_NODE_NAME).toBe("thoughtsBlock");
    expect(ThoughtsBlock.name).toBe("thoughtsBlock");
  });

  it("renders the content hole inside its own wrapper so ProseMirror can serialize it safely", () => {
    const renderHTML = (ThoughtsBlock as unknown as {
      config: {
        renderHTML: (props: { HTMLAttributes: Record<string, unknown> }) => unknown;
      };
    }).config.renderHTML;

    expect(renderHTML({ HTMLAttributes: { summary: "  Camp notes  " } })).toEqual([
      "details",
      ["summary", {}, "Camp notes"],
      ["div", { class: "thoughts-block-content" }, 0],
    ]);
  });

  it("keeps the canonical thoughts block shape in sync with the editor extension", () => {
    expect(createThoughtsBlockNode("  Camp notes  ")).toEqual({
      type: THOUGHTS_BLOCK_NODE_NAME,
      attrs: { summary: "Camp notes" },
      content: [{ type: "paragraph" }],
    });
  });
});
