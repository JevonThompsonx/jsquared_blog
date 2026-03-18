import { htmlToPlainText } from "@/lib/content";
import type { BlogPost } from "@/types/blog";

const SEASON_LABELS = ["Winter", "Spring", "Summer", "Fall"] as const;

type SeasonIndex = 0 | 1 | 2 | 3;

export type SeasonPostGroup = {
  key: string;
  label: string;
  posts: BlogPost[];
};

function getUtcDateParts(dateString: string): { year: number; month: number } {
  const date = new Date(dateString);

  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth(),
  };
}

function getSeasonParts(dateString: string): { year: number; seasonIndex: SeasonIndex } {
  const { year, month } = getUtcDateParts(dateString);

  if (month === 11) {
    return { year: year + 1, seasonIndex: 0 };
  }

  if (month <= 1) {
    return { year, seasonIndex: 0 };
  }

  if (month <= 4) {
    return { year, seasonIndex: 1 };
  }

  if (month <= 7) {
    return { year, seasonIndex: 2 };
  }

  return { year, seasonIndex: 3 };
}

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

export function getCategoryFeedHref(category: string): `/category/${string}/feed.xml` {
  return `/category/${encodeURIComponent(category)}/feed.xml`;
}

export function getTagHref(slug: string): `/tag/${string}` {
  return `/tag/${slug}`;
}

export function getTagFeedHref(slug: string): `/tag/${string}/feed.xml` {
  return `/tag/${slug}/feed.xml`;
}

export function getAuthorHref(userId: string): `/author/${string}` {
  return `/author/${userId}`;
}

export function getSeriesHref(slug: string): `/series/${string}` {
  return `/series/${slug}`;
}

export function getMapHref(): "/map" {
  return "/map";
}

export function getPreviewHref(postId: string): `/preview/${string}` {
  return `/preview/${postId}`;
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

export function formatRelativeDate(value: string): string {
  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  const diffMs = new Date(value).getTime() - Date.now();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
  const absDays = Math.abs(diffDays);
  if (absDays < 1) return rtf.format(Math.round(diffMs / (1000 * 60 * 60)), "hour");
  if (absDays < 7) return rtf.format(diffDays, "day");
  if (absDays < 30) return rtf.format(Math.round(diffDays / 7), "week");
  if (absDays < 365) return rtf.format(Math.round(diffDays / 30), "month");
  return rtf.format(Math.round(diffDays / 365), "year");
}

export function formatSeasonYear(dateString: string): string {
  const { year, seasonIndex } = getSeasonParts(dateString);

  return `${SEASON_LABELS[seasonIndex]} ${year}`;
}

export function getSeasonKey(dateString: string): string {
  const { year, seasonIndex } = getSeasonParts(dateString);

  return `${year}-${seasonIndex + 1}`;
}

export function getSeasonLabel(dateString: string): string {
  return formatSeasonYear(dateString);
}

export function groupPostsBySeason(posts: BlogPost[]): SeasonPostGroup[] {
  const groups = new Map<string, SeasonPostGroup>();

  for (const post of posts) {
    const key = getSeasonKey(post.createdAt);
    const existingGroup = groups.get(key);

    if (existingGroup) {
      existingGroup.posts.push(post);
      continue;
    }

    groups.set(key, {
      key,
      label: getSeasonLabel(post.createdAt),
      posts: [post],
    });
  }

  return Array.from(groups.values());
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
