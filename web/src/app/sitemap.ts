import type { MetadataRoute } from "next";

import {
  getCanonicalPostUrl,
  getCategoryHref,
  getTagHref,
  getSeriesHref,
  SITE_URL,
} from "@/lib/utils";
import { listAdminCategories } from "@/server/dal/admin-posts";
import { listAllTagsWithCounts } from "@/server/dal/admin-tags";
import { listAllSeries, listPublishedPostsInSeries } from "@/server/dal/series";
import { listPublishedPosts } from "@/server/queries/posts";
import type { BlogPost } from "@/types/blog";

// Keep sitemap generation bounded even if the database unexpectedly grows
// without limit. Posts are fetched in 100-row pages until exhausted.
const POST_PAGE_SIZE = 100;
const MAX_POSTS = 5000;

function toDate(value: string | Date | null | undefined): Date | null {
  if (!value) {
    return null;
  }

  const date = value instanceof Date ? value : new Date(value);

  return Number.isNaN(date.getTime()) ? null : date;
}

function getPostLastModified(post: BlogPost): Date | null {
  return toDate(post.updatedAt ?? post.publishedAt ?? post.createdAt);
}

function keepNewest(
  current: Date | undefined,
  candidate: Date | null,
): Date | undefined {
  if (!candidate) {
    return current;
  }

  if (!current || candidate.getTime() > current.getTime()) {
    return candidate;
  }

  return current;
}

async function listPostsForSitemap(): Promise<BlogPost[]> {
  const postsById = new Map<string, BlogPost>();

  try {
    for (let offset = 0; offset < MAX_POSTS; offset += POST_PAGE_SIZE) {
      const page = await listPublishedPosts(POST_PAGE_SIZE, offset);

      for (const post of page) {
        postsById.set(post.id, post);
      }

      if (page.length < POST_PAGE_SIZE) {
        break;
      }
    }
  } catch (error) {
    // `listPublishedPosts` already degrades to an empty page on database
    // errors; this guard keeps any unexpected failure from dropping the rest
    // of the sitemap.
    console.error(
      "[sitemap] Failed to page published posts:",
      (error as Error).message,
    );
  }

  return Array.from(postsById.values()).slice(0, MAX_POSTS);
}

async function getSeriesLastModified(seriesId: string): Promise<Date | null> {
  try {
    const seriesPosts = await listPublishedPostsInSeries(seriesId);
    let newest: Date | null = null;

    for (const post of seriesPosts) {
      newest =
        keepNewest(
          newest ?? undefined,
          toDate(post.publishedAt ?? post.createdAt),
        ) ?? null;
    }

    return newest;
  } catch (error) {
    console.error(
      "[sitemap] Failed to load series posts:",
      (error as Error).message,
    );
    return null;
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const posts = await listPostsForSitemap();

  const categoryLastModified = new Map<string, Date>();
  const tagLastModified = new Map<string, Date>();
  let newestPostDate: Date | undefined;

  for (const post of posts) {
    const lastModified = getPostLastModified(post);

    if (!lastModified) {
      continue;
    }

    newestPostDate = keepNewest(newestPostDate, lastModified);

    if (post.category) {
      categoryLastModified.set(
        post.category,
        keepNewest(categoryLastModified.get(post.category), lastModified) ??
          lastModified,
      );
    }

    for (const tag of post.tags) {
      tagLastModified.set(
        tag.slug,
        keepNewest(tagLastModified.get(tag.slug), lastModified) ?? lastModified,
      );
    }
  }

  const homeEntry: MetadataRoute.Sitemap[number] = {
    url: SITE_URL,
    changeFrequency: "daily",
    priority: 1,
    // Only advertise a last-modified date when it reflects real content.
    ...(newestPostDate ? { lastModified: newestPostDate } : {}),
  };

  const staticPages: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/map`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${SITE_URL}/about`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${SITE_URL}/wishlist`, changeFrequency: "weekly", priority: 0.6 },
    { url: `${SITE_URL}/series`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${SITE_URL}/tags`, changeFrequency: "weekly", priority: 0.6 },
    { url: `${SITE_URL}/categories`, changeFrequency: "weekly", priority: 0.6 },
    { url: `${SITE_URL}/privacy`, changeFrequency: "yearly", priority: 0.3 },
    {
      url: `${SITE_URL}/accessibility`,
      changeFrequency: "yearly",
      priority: 0.3,
    },
  ];

  try {
    const [categories, tags, allSeries] = await Promise.all([
      listAdminCategories(),
      listAllTagsWithCounts(),
      listAllSeries(),
    ]);

    const postEntries: MetadataRoute.Sitemap = posts.map((post) => ({
      url: getCanonicalPostUrl(post),
      lastModified: getPostLastModified(post) ?? undefined,
      changeFrequency: "weekly",
      priority: 0.8,
    }));

    const categoryEntries: MetadataRoute.Sitemap = categories.map(
      (category) => ({
        url: `${SITE_URL}${getCategoryHref(category.slug)}`,
        lastModified: categoryLastModified.get(category.name),
        changeFrequency: "weekly",
        priority: 0.6,
      }),
    );

    const tagEntries: MetadataRoute.Sitemap = tags.map((tag) => ({
      url: `${SITE_URL}${getTagHref(tag.slug)}`,
      lastModified: tagLastModified.get(tag.slug),
      changeFrequency: "weekly",
      priority: 0.5,
    }));

    const seriesEntries: MetadataRoute.Sitemap = await Promise.all(
      allSeries.map(async (series) => ({
        url: `${SITE_URL}${getSeriesHref(series.slug)}`,
        lastModified: (await getSeriesLastModified(series.id)) ?? undefined,
        changeFrequency: "monthly",
        priority: 0.5,
      })),
    );

    return [
      homeEntry,
      ...staticPages,
      ...postEntries,
      ...categoryEntries,
      ...tagEntries,
      ...seriesEntries,
    ];
  } catch (error) {
    console.error(
      "[sitemap] Failed to build taxonomy entries:",
      (error as Error).message,
    );
    // Return home + static entries when the taxonomy database is unavailable.
    return [homeEntry, ...staticPages];
  }
}
