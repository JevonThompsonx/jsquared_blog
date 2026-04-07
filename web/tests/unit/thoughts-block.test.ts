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

  it("keeps the canonical thoughts block shape in sync with the editor extension", () => {
    expect(createThoughtsBlockNode("  Camp notes  ")).toEqual({
      type: THOUGHTS_BLOCK_NODE_NAME,
      attrs: { summary: "Camp notes" },
      content: [{ type: "paragraph" }],
    });
  });
});
