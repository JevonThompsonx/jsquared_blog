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

export function getCategoryHref(category: string): `/category/${string}` {
  return `/category/${encodeURIComponent(category)}`;
}

export function getTagHref(slug: string): `/tag/${string}` {
  return `/tag/${slug}`;
}

export function getAuthorHref(userId: string): `/author/${string}` {
  return `/author/${userId}`;
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

export { htmlToPlainText };
