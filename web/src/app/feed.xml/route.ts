import { listAllPublishedPosts } from "@/server/queries/posts";
import { escapeXml, getCanonicalPostUrl, htmlToPlainText } from "@/lib/utils";

export async function GET() {
  const posts = await listAllPublishedPosts();
  const buildDate = new Date().toUTCString();

  const items = posts
    .map((post) => {
      const description = escapeXml(htmlToPlainText(post.description).slice(0, 300));

      return `
        <item>
          <title>${escapeXml(post.title)}</title>
          <link>${getCanonicalPostUrl(post)}</link>
          <guid>${getCanonicalPostUrl(post)}</guid>
          <pubDate>${new Date(post.createdAt).toUTCString()}</pubDate>
          <description>${description}</description>
        </item>`;
    })
    .join("");

  const rss = `<?xml version="1.0" encoding="UTF-8"?>
  <rss version="2.0">
    <channel>
      <title>J²Adventures</title>
      <link>https://jsquaredadventures.com</link>
      <description>Travel stories and adventures from J²Adventures.</description>
      <lastBuildDate>${buildDate}</lastBuildDate>${items}
    </channel>
  </rss>`;

  return new Response(rss, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, max-age=1800",
    },
  });
}
