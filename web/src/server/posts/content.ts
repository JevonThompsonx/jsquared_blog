import "server-only";

import {
  deriveExcerptFromContent,
  getTiptapImageAltWarnings,
  parseCanonicalTiptapDocument,
  renderTiptapJson,
  htmlToPlainText,
  type TiptapImageAltWarning,
} from "@/lib/content";

export type DerivedPostContent = {
  canonicalContentJson: string;
  contentFormat: "tiptap-json";
  contentHtml: string | null;
  contentPlainText: string | null;
  excerpt: string | null;
  imageAltWarnings: TiptapImageAltWarning[];
};

export function derivePostContent(contentJson: string, manualExcerpt?: string | null): DerivedPostContent {
  const document = parseCanonicalTiptapDocument(contentJson);
  if (!document) {
    throw new Error("Content must be valid Tiptap JSON");
  }

  const canonicalContentJson = JSON.stringify(document);
  const contentHtml = renderTiptapJson(canonicalContentJson);
  const contentPlainText = htmlToPlainText(contentHtml) || null;
  const excerpt = manualExcerpt?.trim() || deriveExcerptFromContent(canonicalContentJson);

  return {
    canonicalContentJson,
    contentFormat: "tiptap-json",
    contentHtml,
    contentPlainText,
    excerpt,
    imageAltWarnings: getTiptapImageAltWarnings(document),
  };
}
