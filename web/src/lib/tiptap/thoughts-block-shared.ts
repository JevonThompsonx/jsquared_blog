/**
 * Pure helpers and constants for the Thoughts block.
 *
 * Keep this module free of `@tiptap/*` imports. `lib/content.ts` uses
 * `normalizeThoughtsBlockSummary` on the server, and `lib/content.ts` is pulled
 * into client components through `lib/utils.ts`. Importing the Tiptap extension
 * here would put ProseMirror (~450 KB) into every public page bundle.
 */

export const DEFAULT_THOUGHTS_BLOCK_SUMMARY = "Thoughts";
export const THOUGHTS_BLOCK_NODE_NAME = "thoughtsBlock";

export type ThoughtsBlockNode = {
  type: typeof THOUGHTS_BLOCK_NODE_NAME;
  attrs: {
    summary: string;
  };
  content: [{ type: "paragraph" }];
};

export function normalizeThoughtsBlockSummary(
  summary: string | null | undefined,
): string {
  if (typeof summary !== "string") {
    return DEFAULT_THOUGHTS_BLOCK_SUMMARY;
  }

  const trimmed = summary.trim();
  return trimmed || DEFAULT_THOUGHTS_BLOCK_SUMMARY;
}

export function createThoughtsBlockNode(
  summary?: string | null,
): ThoughtsBlockNode {
  return {
    type: THOUGHTS_BLOCK_NODE_NAME,
    attrs: {
      summary: normalizeThoughtsBlockSummary(summary),
    },
    content: [{ type: "paragraph" }],
  };
}
