import sanitizeHtml, { type Attributes, type IFrame } from "sanitize-html";
import { z } from "zod";

const tiptapMarkSchema = z.object({
  type: z.string().optional(),
  attrs: z.record(z.string(), z.unknown()).optional(),
});

type TiptapMark = z.infer<typeof tiptapMarkSchema>;

type TiptapNode = {
  type?: string;
  text?: string;
  attrs?: Record<string, unknown>;
  marks?: TiptapMark[];
  content?: TiptapNode[];
};

const tiptapNodeSchema: z.ZodType<TiptapNode> = z.lazy(() => z.object({
  type: z.string().optional(),
  text: z.string().optional(),
  attrs: z.record(z.string(), z.unknown()).optional(),
  marks: z.array(tiptapMarkSchema).optional(),
  content: z.array(tiptapNodeSchema).optional(),
}));

export const tiptapDocumentSchema = z.object({
  type: z.literal("doc"),
  content: z.array(tiptapNodeSchema).optional().default([]),
});

const legacyHtmlContentSchema = z.object({
  type: z.literal("legacy-html"),
  html: z.string(),
});

export type TiptapDocument = z.infer<typeof tiptapDocumentSchema>;
export type TiptapNodePath = number[];
export type TiptapImageAltWarning = {
  code: "missing-image-alt";
  message: string;
  path: TiptapNodePath;
  imageSrc: string | null;
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function decodeHtmlEntities(value: string): string {
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

function safeJsonParse(value: string): unknown {
  return JSON.parse(value);
}

function sanitizeHref(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  if (/^(https?:|mailto:)/i.test(trimmed)) {
    return trimmed;
  }

  return null;
}

function sanitizeImageSrc(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  return null;
}

const RICH_TEXT_ALLOWED_TAGS = [
  "a",
  "blockquote",
  "br",
  "code",
  "em",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "hr",
  "img",
  "li",
  "ol",
  "p",
  "pre",
  "s",
  "strong",
  "ul",
] as const;

const EMPTY_HTML_ATTRIBUTES: Attributes = {};

const richTextSanitizerOptions: sanitizeHtml.IOptions = {
  allowedTags: [...RICH_TEXT_ALLOWED_TAGS],
  allowedAttributes: {
    a: ["href", "target", "rel"],
    img: ["src", "alt", "title", "loading"],
  },
  allowedSchemes: ["http", "https", "mailto"],
  allowedSchemesAppliedToAttributes: ["href", "src"],
  allowProtocolRelative: false,
  disallowedTagsMode: "discard",
  enforceHtmlBoundary: true,
  nonBooleanAttributes: sanitizeHtml.defaults.nonBooleanAttributes.filter((attribute: string) => attribute !== "loading"),
  parseStyleAttributes: false,
  transformTags: {
    a: (_tagName: string, attributes: Attributes) => {
      const href = sanitizeHref(attributes.href);
      if (!href) {
        return { tagName: "a", attribs: EMPTY_HTML_ATTRIBUTES };
      }

      return {
        tagName: "a",
        attribs: {
          href,
          target: "_blank",
          rel: "noreferrer",
        },
      };
    },
    img: (_tagName: string, attributes: Attributes) => {
      const src = sanitizeImageSrc(attributes.src);
      if (!src) {
        return { tagName: "img", attribs: EMPTY_HTML_ATTRIBUTES };
      }

      const alt = typeof attributes.alt === "string" ? attributes.alt : "";
      const title = typeof attributes.title === "string" ? attributes.title : undefined;

      return {
        tagName: "img",
        attribs: {
          src,
          alt,
          ...(title ? { title } : {}),
          loading: "lazy",
        },
      };
    },
  },
  exclusiveFilter(frame: IFrame) {
    if (frame.tag === "a" && !frame.attribs.href) {
      return "excludeTag";
    }

    if (frame.tag === "img" && !frame.attribs.src) {
      return true;
    }

    return false;
  },
};

function applyMarks(text: string, marks?: TiptapMark[]): string {
  if (!marks || marks.length === 0) {
    return text;
  }

  return marks.reduce((output, mark) => {
    switch (mark.type) {
      case "bold":
        return `<strong>${output}</strong>`;
      case "italic":
        return `<em>${output}</em>`;
      case "strike":
        return `<s>${output}</s>`;
      case "code":
        return `<code>${output}</code>`;
      case "link": {
        const href = sanitizeHref(mark.attrs?.href);
        if (!href) {
          return output;
        }

        return `<a href="${escapeHtml(href)}" target="_blank" rel="noreferrer">${output}</a>`;
      }
      default:
        return output;
    }
  }, text);
}

function renderChildren(nodes?: TiptapNode[]): string {
  return (nodes ?? []).map((node) => renderTiptapNode(node)).join("");
}

function renderTiptapNode(node: TiptapNode): string {
  switch (node.type) {
    case "doc":
      return renderChildren(node.content);
    case "paragraph":
      return `<p>${renderChildren(node.content)}</p>`;
    case "text":
      return applyMarks(escapeHtml(node.text ?? ""), node.marks);
    case "heading": {
      const rawLevel = node.attrs?.level;
      const level = typeof rawLevel === "number" && rawLevel >= 1 && rawLevel <= 6 ? rawLevel : 2;
      return `<h${level}>${renderChildren(node.content)}</h${level}>`;
    }
    case "bulletList":
      return `<ul>${renderChildren(node.content)}</ul>`;
    case "orderedList":
      return `<ol>${renderChildren(node.content)}</ol>`;
    case "listItem":
      return `<li>${renderChildren(node.content)}</li>`;
    case "blockquote":
      return `<blockquote>${renderChildren(node.content)}</blockquote>`;
    case "codeBlock":
      return `<pre><code>${renderChildren(node.content)}</code></pre>`;
    case "hardBreak":
      return "<br />";
    case "horizontalRule":
      return "<hr />";
    case "image": {
      const src = sanitizeImageSrc(node.attrs?.src);
      if (!src) {
        return "";
      }

      const alt = typeof node.attrs?.alt === "string" ? node.attrs.alt.trim() : "";
      const title = typeof node.attrs?.title === "string" ? node.attrs.title.trim() : "";
      const titleAttribute = title ? ` title="${escapeHtml(title)}"` : "";
      return `<img src="${escapeHtml(src)}" alt="${escapeHtml(alt)}"${titleAttribute} loading="lazy" />`;
    }
    default:
      return renderChildren(node.content);
  }
}

export function createEmptyTiptapDocument(): TiptapDocument {
  return {
    type: "doc",
    content: [{ type: "paragraph" }],
  };
}

export function parseCanonicalTiptapDocument(contentJson: string | null | undefined): TiptapDocument | null {
  if (!contentJson) {
    return null;
  }

  try {
    return tiptapDocumentSchema.parse(safeJsonParse(contentJson));
  } catch {
    return null;
  }
}

export function isLegacyHtmlContent(contentJson: string | null | undefined): boolean {
  if (!contentJson) {
    return false;
  }

  try {
    return legacyHtmlContentSchema.safeParse(safeJsonParse(contentJson)).success;
  } catch {
    return false;
  }
}

export function deriveExcerptFromContent(contentJson: string, maxLength = 280): string | null {
  const renderedHtml = renderTiptapJson(contentJson);
  const plainText = htmlToPlainText(renderedHtml);
  if (!plainText) {
    return null;
  }

  return plainText.slice(0, maxLength) || null;
}

function collectImageAltWarnings(node: TiptapNode, path: number[], warnings: TiptapImageAltWarning[]): void {
  if (node.type === "image") {
    const rawAlt = node.attrs?.alt;
    const alt = typeof rawAlt === "string" ? rawAlt.trim() : "";
    const rawSrc = node.attrs?.src;
    const imageSrc = typeof rawSrc === "string" && rawSrc.trim() ? rawSrc.trim() : null;

    if (!alt) {
      warnings.push({
        code: "missing-image-alt",
        message: "Add alt text to every inline image before publishing.",
        path,
        imageSrc,
      });
    }
  }

  node.content?.forEach((child, index) => {
    collectImageAltWarnings(child, [...path, index], warnings);
  });
}

export function getTiptapImageAltWarnings(content: string | TiptapDocument): TiptapImageAltWarning[] {
  const document = typeof content === "string" ? parseCanonicalTiptapDocument(content) : content;
  if (!document) {
    return [];
  }

  const warnings: TiptapImageAltWarning[] = [];
  document.content.forEach((node, index) => {
    collectImageAltWarnings(node, [index], warnings);
  });
  return warnings;
}

export function renderTiptapJson(contentJson: string | null | undefined): string | null {
  if (!contentJson) {
    return null;
  }

  try {
    const parsed = safeJsonParse(contentJson);
    const legacyContent = legacyHtmlContentSchema.safeParse(parsed);
    if (legacyContent.success) {
      return sanitizeRichTextHtml(legacyContent.data.html);
    }

    const canonicalContent = tiptapDocumentSchema.safeParse(parsed);
    if (!canonicalContent.success) {
      return null;
    }

    return sanitizeRichTextHtml(renderTiptapNode(canonicalContent.data));
  } catch {
    return null;
  }
}

export function sanitizeRichTextHtml(html: string | null | undefined): string {
  if (!html) {
    return "<p>This story is still being migrated.</p>";
  }

  return sanitizeHtml(html, richTextSanitizerOptions);
}

export function htmlToPlainText(html: string | null | undefined): string {
  if (!html) {
    return "";
  }

  const stripped = sanitizeRichTextHtml(html)
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return decodeHtmlEntities(stripped).replace(/\s+/g, " ").trim();
}

export function getWordCount(html: string | null | undefined): number {
  const plainText = htmlToPlainText(html);

  if (!plainText) {
    return 0;
  }

  return plainText.split(/\s+/).filter(Boolean).length;
}

export function getReadingTimeMinutes(html: string | null | undefined, wordsPerMinute = 220): number {
  const safeWordsPerMinute = Number.isFinite(wordsPerMinute) && wordsPerMinute > 0 ? wordsPerMinute : 220;
  const wordCount = getWordCount(html);

  if (wordCount === 0) {
    return 0;
  }

  return Math.max(1, Math.ceil(wordCount / safeWordsPerMinute));
}

export type TocHeading = { id: string; text: string; level: number };

function slugifyHeading(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function processHeadings(html: string): { html: string; headings: TocHeading[] } {
  const headings: TocHeading[] = [];
  const seen = new Map<string, number>();

  const processedHtml = html.replace(
    /<h([2-4])([^>]*)>([\s\S]*?)<\/h\1>/gi,
    (_, levelStr, attrs: string, inner: string) => {
      const level = Number.parseInt(levelStr, 10);
      const text = inner
        .replace(/<[^>]+>/g, "")
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .trim();
      const base = slugifyHeading(text) || `heading-${headings.length}`;
      const count = seen.get(base) ?? 0;
      const id = count === 0 ? base : `${base}-${count}`;
      seen.set(base, count + 1);
      headings.push({ id, text, level });
      return `<h${level} id="${id}"${attrs}>${inner}</h${level}>`;
    },
  );

  return { html: processedHtml, headings };
}
