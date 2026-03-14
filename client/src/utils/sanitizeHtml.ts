import DOMPurify from "dompurify";

const SANITIZE_OPTIONS = {
  USE_PROFILES: { html: true },
  ADD_ATTR: ["target", "rel"],
};

export function sanitizeHtml(html: string | null | undefined, fallback = ""): string {
  if (!html) {
    return fallback;
  }

  return DOMPurify.sanitize(html, SANITIZE_OPTIONS);
}
