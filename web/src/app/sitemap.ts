import type { MetadataRoute } from "next";

import { getCanonicalPostUrl, getCategoryHref, getTagHref, getSeriesHref, SITE_URL } from "@/lib/utils";
import { listAdminCategories } from "@/server/dal/admin-posts";
import { listAllTagsWithCounts } from "@/server/dal/admin-tags";
import { listAllSeries } from "@/server/dal/series";
import { listPublishedPosts } from "@/server/queries/posts";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const baseEntry: MetadataRoute.Sitemap[number] = {
    url: SITE_URL,
    lastModified: now,
    changeFrequency: "daily",
    priority: 1,
  };

  const staticPages: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/map`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${SITE_URL}/about`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: `${SITE_URL}/wishlist`, lastModified: now, changeFrequency: "weekly", priority: 0.6 },
    { url: `${SITE_URL}/tags`, lastModified: now, changeFrequency: "weekly", priority: 0.6 },
    { url: `${SITE_URL}/categories`, lastModified: now, changeFrequency: "weekly", priority: 0.6 },
  ];

  try {
    const [posts, categories, tags, allSeries] = await Promise.all([
      listPublishedPosts(100),
      listAdminCategories(),
      listAllTagsWithCounts(),
      listAllSeries(),
    ]);

    const postEntries: MetadataRoute.Sitemap = posts.map((post) => ({
      url: getCanonicalPostUrl(post),
      lastModified: new Date(post.createdAt),
      changeFrequency: "weekly",
      priority: 0.8,
    }));

    const categoryEntries: MetadataRoute.Sitemap = categories.map((cat) => ({
      url: `${SITE_URL}${getCategoryHref(cat.slug)}`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.6,
    }));

    const tagEntries: MetadataRoute.Sitemap = tags.map((tag) => ({
      url: `${SITE_URL}${getTagHref(tag.slug)}`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.5,
    }));

    const seriesEntries: MetadataRoute.Sitemap = allSeries.map((s) => ({
      url: `${SITE_URL}${getSeriesHref(s.slug)}`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.5,
    }));

    return [baseEntry, ...staticPages, ...postEntries, ...categoryEntries, ...tagEntries, ...seriesEntries];
  } catch (error) {
    console.error("[sitemap] Failed to list published posts:", (error as Error).message);
    // Return base + static entries when database is unavailable
    return [baseEntry, ...staticPages];
  }
}
