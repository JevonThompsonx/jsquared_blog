import type { MetadataRoute } from "next";

import { getCanonicalPostUrl } from "@/lib/utils";
import { listPublishedPosts } from "@/server/queries/posts";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseEntry: MetadataRoute.Sitemap[number] = {
    url: "https://jsquaredadventures.com",
    lastModified: new Date(),
    changeFrequency: "daily",
    priority: 1,
  };

  try {
    const posts = await listPublishedPosts(100);
    const postEntries: MetadataRoute.Sitemap = posts.map((post) => ({
      url: getCanonicalPostUrl(post),
      lastModified: new Date(post.createdAt),
      changeFrequency: "weekly",
      priority: 0.8,
    }));

    return [baseEntry, ...postEntries];
  } catch (error) {
    console.error("[sitemap] Failed to list published posts:", (error as Error).message);
    // Return base entry only when database is unavailable
    return [baseEntry];
  }
}
