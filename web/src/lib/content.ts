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

export function buildLegacyHtmlPayload(html: string | null | undefined): string {
  return JSON.stringify({
    type: "legacy-html",
    html: sanitizeRichTextHtml(html),
  });
}

export function getEditableHtmlFromContent(contentJson: string | null | undefined): string {
  if (!contentJson) {
    return "<p></p>";
  }

  try {
    const parsed = JSON.parse(contentJson) as { type?: string; html?: string };
    if (parsed.type === "legacy-html" && typeof parsed.html === "string") {
      return parsed.html;
    }
  } catch {
    // Fall through to rendered HTML.
  }

  return renderTiptapJson(contentJson) ?? "<p></p>";
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
