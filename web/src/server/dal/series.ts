import "server-only";

import { and, asc, eq } from "drizzle-orm";

import { mediaAssets, posts, series } from "@/drizzle/schema";
import { getDb } from "@/lib/db";
import { slugify } from "@/lib/utils";

export type SeriesRecord = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
};

export type SeriesNavResult = {
  series: SeriesRecord;
  order: number;
  totalParts: number;
  prevPost: { id: string; title: string; slug: string } | null;
  nextPost: { id: string; title: string; slug: string } | null;
};

export type SeriesPostItem = {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  imageUrl: string | null;
  seriesOrder: number | null;
  publishedAt: Date | null;
  createdAt: Date;
};

export async function getSeriesBySlug(slug: string): Promise<SeriesRecord | null> {
  const db = getDb();
  const rows = await db
    .select({ id: series.id, title: series.title, slug: series.slug, description: series.description })
    .from(series)
    .where(eq(series.slug, slug))
    .limit(1);
  return rows[0] ?? null;
}

export async function listPublishedPostsInSeries(seriesId: string): Promise<SeriesPostItem[]> {
  const db = getDb();
  return db
    .select({
      id: posts.id,
      title: posts.title,
      slug: posts.slug,
      excerpt: posts.excerpt,
      imageUrl: mediaAssets.secureUrl,
      seriesOrder: posts.seriesOrder,
      publishedAt: posts.publishedAt,
      createdAt: posts.createdAt,
    })
    .from(posts)
    .leftJoin(mediaAssets, eq(posts.featuredImageId, mediaAssets.id))
    .where(and(eq(posts.seriesId, seriesId), eq(posts.status, "published")))
    .orderBy(asc(posts.seriesOrder), asc(posts.publishedAt));
}

export async function getSeriesNavForPost(postId: string): Promise<SeriesNavResult | null> {
  const db = getDb();

  const postRows = await db
    .select({ seriesId: posts.seriesId, seriesOrder: posts.seriesOrder })
    .from(posts)
    .where(eq(posts.id, postId))
    .limit(1);

  const postRow = postRows[0];
  if (!postRow?.seriesId) return null;

  const [seriesRows, seriesPosts] = await Promise.all([
    db
      .select({ id: series.id, title: series.title, slug: series.slug, description: series.description })
      .from(series)
      .where(eq(series.id, postRow.seriesId))
      .limit(1),
    db
      .select({ id: posts.id, title: posts.title, slug: posts.slug, seriesOrder: posts.seriesOrder })
      .from(posts)
      .where(and(eq(posts.seriesId, postRow.seriesId), eq(posts.status, "published")))
      .orderBy(asc(posts.seriesOrder), asc(posts.publishedAt)),
  ]);

  const seriesInfo = seriesRows[0];
  if (!seriesInfo) return null;

  const currentIndex = seriesPosts.findIndex((p) => p.id === postId);
  const prevPost = currentIndex > 0 ? (seriesPosts[currentIndex - 1] ?? null) : null;
  const nextPost = currentIndex < seriesPosts.length - 1 ? (seriesPosts[currentIndex + 1] ?? null) : null;

  return {
    series: seriesInfo,
    order: currentIndex + 1,
    totalParts: seriesPosts.length,
    prevPost: prevPost ? { id: prevPost.id, title: prevPost.title, slug: prevPost.slug } : null,
    nextPost: nextPost ? { id: nextPost.id, title: nextPost.title, slug: nextPost.slug } : null,
  };
}

export async function listAllSeries(): Promise<SeriesRecord[]> {
  const db = getDb();
  return db
    .select({ id: series.id, title: series.title, slug: series.slug, description: series.description })
    .from(series)
    .orderBy(series.title);
}

export async function ensureSeriesId(title: string): Promise<string | null> {
  const trimmedTitle = title.trim();
  if (!trimmedTitle) return null;

  const db = getDb();
  const slug = slugify(trimmedTitle);

  const existing = await db.query.series.findFirst({
    where: eq(series.slug, slug),
    columns: { id: true },
  });

  if (existing) return existing.id;

  const id = `series-${slug}`;
  await db
    .insert(series)
    .values({ id, title: trimmedTitle, slug, description: null, createdAt: new Date() })
    .onConflictDoUpdate({ target: series.id, set: { title: trimmedTitle, slug } });

  return id;
}

export type SeriesPartNumbers = {
  takenNumbers: number[];
  next: number;
};

/**
 * Returns the part numbers already assigned to posts in a series, plus the
 * next suggested part number (max + 1, or 1 if the series is empty).
 */
export async function getSeriesPartNumbers(seriesId: string): Promise<SeriesPartNumbers> {
  const db = getDb();
  const rows = await db
    .select({ seriesOrder: posts.seriesOrder })
    .from(posts)
    .where(eq(posts.seriesId, seriesId));

  const takenNumbers = rows
    .map((r) => r.seriesOrder)
    .filter((n): n is number => typeof n === "number");

  const next = takenNumbers.length === 0 ? 1 : Math.max(...takenNumbers) + 1;

  return { takenNumbers, next };
}
