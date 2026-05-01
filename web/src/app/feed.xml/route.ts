import { listAllPublishedPosts } from "@/server/queries/posts";
import { buildRssXml, createRssResponse } from "@/server/feeds/rss";

export async function GET() {
  try {
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
  } catch (error) {
    console.error("[feed.xml] Failed to list published posts:", (error as Error).message);
    return createRssResponse(
      buildRssXml({
        title: "J²Adventures",
        description: "Travel stories and adventures from J²Adventures.",
        siteUrl: "https://jsquaredadventures.com",
        selfUrl: "https://jsquaredadventures.com/feed.xml",
        posts: [],
      }),
    );
  }
}
