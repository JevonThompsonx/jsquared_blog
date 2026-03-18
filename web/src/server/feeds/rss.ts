import "server-only";

import type { BlogPost } from "@/types/blog";
import { escapeXml, getCanonicalPostUrl, htmlToPlainText } from "@/lib/utils";

type FeedOptions = {
  title: string;
  description: string;
  siteUrl: string;
  selfUrl: string;
  posts: BlogPost[];
};

export function buildRssXml({ title, description, siteUrl, selfUrl, posts }: FeedOptions): string {
  const buildDate = new Date().toUTCString();
  const items = posts
    .map((post) => {
      const descriptionText = escapeXml(htmlToPlainText(post.description).slice(0, 300));
      const postUrl = getCanonicalPostUrl(post);

      return `
        <item>
          <title>${escapeXml(post.title)}</title>
          <link>${postUrl}</link>
          <guid>${postUrl}</guid>
          <pubDate>${new Date(post.publishedAt ?? post.createdAt).toUTCString()}</pubDate>
          <description>${descriptionText}</description>
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
