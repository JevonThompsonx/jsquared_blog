import { htmlToPlainText } from "@/lib/content";
import type { BlogPost } from "@/types/blog";

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export function toPostSlug(post: Pick<BlogPost, "id" | "title" | "slug">): string {
  if (post.slug) {
    return slugify(post.slug);
  }

  return `${post.id}-${slugify(post.title)}`;
}

export function getPostHref(post: Pick<BlogPost, "id" | "title" | "slug">): `/posts/${string}` {
  return `/posts/${toPostSlug(post)}`;
}

export function getCanonicalPostUrl(post: Pick<BlogPost, "id" | "title" | "slug">): string {
  return `https://jsquaredadventures.com${getPostHref(post)}`;
}

export function getPostIdFromSlug(slug: string): number | null {
  const match = slug.match(/^(\d+)/);
  if (!match) {
    return null;
  }

  const postId = Number(match[1]);
  return Number.isInteger(postId) && postId > 0 ? postId : null;
}

export function formatPublishedDate(value: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

export function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function getLegacyApiBaseUrl(): string {
  const fromEnv = process.env.LEGACY_API_BASE_URL;
  if (fromEnv) {
    return fromEnv.replace(/\/$/, "");
  }

  if (process.env.NODE_ENV === "development") {
    return "http://127.0.0.1:8787";
  }

  return "https://jsquaredadventures.com";
}

export { htmlToPlainText };
