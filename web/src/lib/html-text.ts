/**
 * Pure HTML-to-text helpers.
 *
 * Kept separate from `lib/content.ts` so client components that only need a
 * short plain-text excerpt do not pull `sanitize-html` + the Tiptap renderer
 * into the public bundle.
 */

export function decodeHtmlEntities(value: string): string {
  return value.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (entity, token: string) => {
    const normalizedToken = token.toLowerCase();

    switch (normalizedToken) {
      case "amp":
        return "&";
      case "lt":
        return "<";
      case "gt":
        return ">";
      case "quot":
        return '"';
      case "apos":
        return "'";
      case "nbsp":
        return " ";
      default:
        break;
    }

    if (normalizedToken.startsWith("#x")) {
      const codePoint = Number.parseInt(normalizedToken.slice(2), 16);
      return Number.isNaN(codePoint) ? entity : String.fromCodePoint(codePoint);
    }

    if (normalizedToken.startsWith("#")) {
      const codePoint = Number.parseInt(normalizedToken.slice(1), 10);
      return Number.isNaN(codePoint) ? entity : String.fromCodePoint(codePoint);
    }

    return entity;
  });
}

/**
 * Strips tags and decodes common entities. This is display text only; callers
 * that need sanitised HTML must use `sanitizeRichTextHtml` in `lib/content.ts`.
 */
export function stripHtmlToPlainText(html: string | null | undefined): string {
  if (!html) {
    return "";
  }

  const stripped = html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return decodeHtmlEntities(stripped).replace(/\s+/g, " ").trim();
}
