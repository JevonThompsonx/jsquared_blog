import "server-only";

import type { BlogPost } from "@/types/blog";
import {
  escapeXml,
  getCanonicalPostUrl,
  htmlToPlainText,
  SITE_URL,
} from "@/lib/utils";

type FeedOptions = {
  title: string;
  description: string;
  siteUrl: string;
  selfUrl: string;
  posts: BlogPost[];
};

const DEFAULT_FEED_AUTHOR = "blog@jsquaredadventures.com (J²Adventures)";

const IMAGE_MIME_BY_EXTENSION: Record<string, string> = {
  avif: "image/avif",
  gif: "image/gif",
  jpeg: "image/jpeg",
  jpg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

/** Resolve possibly-relative media URLs against the canonical site URL. */
function toAbsoluteUrl(value: string): string {
  if (/^https?:\/\//i.test(value)) {
    return value;
  }

  return `${SITE_URL}${value.startsWith("/") ? value : `/${value}`}`;
}

function getImageMimeType(url: string): string {
  const extension = /\.([a-z0-9]+)(?:[?#]|$)/i.exec(url)?.[1]?.toLowerCase();

  return (extension && IMAGE_MIME_BY_EXTENSION[extension]) || "image/jpeg";
}

export function buildRssXml({
  title,
  description,
  siteUrl,
  selfUrl,
  posts,
}: FeedOptions): string {
  const buildDate = new Date().toUTCString();
  const items = posts
    .map((post) => {
      const descriptionText = escapeXml(
        htmlToPlainText(post.description).slice(0, 300),
      );
      const postUrl = getCanonicalPostUrl(post);
      const enclosure = post.imageUrl
        ? `
          <enclosure url="${escapeXml(toAbsoluteUrl(post.imageUrl))}" type="${getImageMimeType(post.imageUrl)}" length="0" />`
        : "";
      const categories = post.tags
        .map(
          (tag) => `
          <category>${escapeXml(tag.name)}</category>`,
        )
        .join("");

      return `
        <item>
          <title>${escapeXml(post.title)}</title>
          <link>${postUrl}</link>
          <guid>${postUrl}</guid>
          <pubDate>${new Date(post.publishedAt ?? post.createdAt).toUTCString()}</pubDate>
          <author>${escapeXml(DEFAULT_FEED_AUTHOR)}</author>
          <description>${descriptionText}</description>${enclosure}${categories}
        </item>`;
    })
    .join("");

  return `<?xml version="1.0" encoding="UTF-8"?>
  <rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
    <channel>
      <title>${escapeXml(title)}</title>
      <link>${siteUrl}</link>
      <description>${escapeXml(description)}</description>
      <atom:link href="${selfUrl}" rel="self" type="application/rss+xml" />
      <lastBuildDate>${buildDate}</lastBuildDate>${items}
    </channel>
  </rss>`;
}

export function createRssResponse(xml: string): Response {
  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, max-age=1800",
    },
  });
}
