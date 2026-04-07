import { Node } from "@tiptap/core";

export const DEFAULT_THOUGHTS_BLOCK_SUMMARY = "Thoughts";
export const THOUGHTS_BLOCK_NODE_NAME = "thoughtsBlock";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    thoughtsBlock: {
      insertThoughtsBlock: (summary?: string | null) => ReturnType;
    };
  }
}

export type ThoughtsBlockNode = {
  type: typeof THOUGHTS_BLOCK_NODE_NAME;
  attrs: {
    summary: string;
  };
  content: [{ type: "paragraph" }];
};

export function normalizeThoughtsBlockSummary(summary: string | null | undefined): string {
  if (typeof summary !== "string") {
    return DEFAULT_THOUGHTS_BLOCK_SUMMARY;
  }

  const trimmed = summary.trim();
  return trimmed || DEFAULT_THOUGHTS_BLOCK_SUMMARY;
}

export function createThoughtsBlockNode(summary?: string | null): ThoughtsBlockNode {
  return {
    type: THOUGHTS_BLOCK_NODE_NAME,
    attrs: {
      summary: normalizeThoughtsBlockSummary(summary),
    },
    content: [{ type: "paragraph" }],
  };
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
      ["summary", {}, normalizeThoughtsBlockSummary(typeof HTMLAttributes.summary === "string" ? HTMLAttributes.summary : null)],
      0,
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
