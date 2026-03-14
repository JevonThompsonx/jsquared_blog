import type { MetadataRoute } from "next";

import { getCanonicalPostUrl } from "@/lib/utils";
import { listPublishedPosts } from "@/server/queries/posts";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const posts = await listPublishedPosts(100);

  return [
    {
      url: "https://jsquaredadventures.com",
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
    },
    ...posts.map((post) => ({
      url: getCanonicalPostUrl(post),
      lastModified: new Date(post.createdAt),
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
  ];
}
