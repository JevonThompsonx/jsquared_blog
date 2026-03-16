import DOMPurify from "isomorphic-dompurify";

const SANITIZE_OPTIONS = {
  USE_PROFILES: { html: true },
  ADD_ATTR: ["target", "rel"],
};

type TiptapMark = {
  type?: string;
  attrs?: Record<string, unknown>;
};

type TiptapNode = {
  type?: string;
  text?: string;
  attrs?: Record<string, unknown>;
  marks?: TiptapMark[];
  content?: TiptapNode[];
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
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
      const level = typeof node.attrs?.level === "number" && node.attrs.level >= 1 && node.attrs.level <= 6
        ? node.attrs.level
        : 2;
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
    default:
      return renderChildren(node.content);
  }
}

export function renderTiptapJson(contentJson: string | null | undefined): string | null {
  if (!contentJson) {
    return null;
  }

  try {
    const parsed = JSON.parse(contentJson) as TiptapNode | { type?: string; html?: string };
    if (parsed && parsed.type === "legacy-html" && "html" in parsed && typeof parsed.html === "string") {
      return sanitizeRichTextHtml(parsed.html);
    }

    if (!parsed || parsed.type !== "doc") {
      return null;
    }

    return sanitizeRichTextHtml(renderTiptapNode(parsed));
  } catch {
    return null;
  }
}

export function sanitizeRichTextHtml(html: string | null | undefined): string {
  if (!html) {
    return "<p>This story is still being migrated.</p>";
  }

  return DOMPurify.sanitize(html, SANITIZE_OPTIONS);
}

export function htmlToPlainText(html: string | null | undefined): string {
  return sanitizeRichTextHtml(html)
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
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

/**
 * Adds `id` attributes to h2–h4 headings in sanitized HTML and returns
 * both the modified HTML and the extracted headings for TOC rendering.
 */
export function processHeadings(html: string): { html: string; headings: TocHeading[] } {
  const headings: TocHeading[] = [];
  const seen = new Map<string, number>();

  const processedHtml = html.replace(
    /<h([2-4])([^>]*)>([\s\S]*?)<\/h\1>/gi,
    (_, levelStr, attrs: string, inner: string) => {
      const level = parseInt(levelStr, 10);
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
