import { Node } from "@tiptap/core";

import {
  createThoughtsBlockNode,
  DEFAULT_THOUGHTS_BLOCK_SUMMARY,
  normalizeThoughtsBlockSummary,
  THOUGHTS_BLOCK_NODE_NAME,
} from "@/lib/tiptap/thoughts-block-shared";

export {
  createThoughtsBlockNode,
  DEFAULT_THOUGHTS_BLOCK_SUMMARY,
  normalizeThoughtsBlockSummary,
  THOUGHTS_BLOCK_NODE_NAME,
  type ThoughtsBlockNode,
} from "@/lib/tiptap/thoughts-block-shared";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    thoughtsBlock: {
      insertThoughtsBlock: (summary?: string | null) => ReturnType;
    };
  }
}

export const ThoughtsBlock = Node.create({
  name: THOUGHTS_BLOCK_NODE_NAME,
  group: "block",
  content: "block+",
  defining: true,

  addAttributes() {
    return {
      summary: {
        default: DEFAULT_THOUGHTS_BLOCK_SUMMARY,
        parseHTML: (element: HTMLElement) => {
          const summary = element.querySelector("summary")?.textContent;
          return normalizeThoughtsBlockSummary(summary);
        },
        renderHTML: (attributes: Record<string, unknown>) => ({
          summary: normalizeThoughtsBlockSummary(
            typeof attributes.summary === "string" ? attributes.summary : null,
          ),
        }),
      },
    };
  },

  parseHTML() {
    return [{ tag: "details" }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "details",
      [
        "summary",
        {},
        normalizeThoughtsBlockSummary(
          typeof HTMLAttributes.summary === "string"
            ? HTMLAttributes.summary
            : null,
        ),
      ],
      ["div", { class: "thoughts-block-content" }, 0],
    ];
  },

  addCommands() {
    return {
      insertThoughtsBlock:
        (summary?: string | null) =>
        ({ commands }) =>
          commands.insertContent(createThoughtsBlockNode(summary)),
    };
  },
});
