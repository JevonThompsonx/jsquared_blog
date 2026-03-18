import { listAllPublishedPosts } from "@/server/queries/posts";
import { buildRssXml, createRssResponse } from "@/server/feeds/rss";

export async function GET() {
  const posts = await listAllPublishedPosts();

  return createRssResponse(
    buildRssXml({
      title: "J²Adventures",
      description: "Travel stories and adventures from J²Adventures.",
      siteUrl: "https://jsquaredadventures.com",
      selfUrl: "https://jsquaredadventures.com/feed.xml",
      posts,
    }),
  );
}
