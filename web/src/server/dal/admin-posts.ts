import "server-only";

import { desc, eq, sql } from "drizzle-orm";

import { categories, mediaAssets, postImages, postTags, posts, series, tags } from "@/drizzle/schema";
import { getDb } from "@/lib/db";

export type AdminPostRecord = {
  id: string;
  slug: string;
  title: string;
  status: "draft" | "published" | "scheduled";
  excerpt: string | null;
  category: string | null;
  imageUrl: string | null;
  createdAt: Date;
  publishedAt: Date | null;
  scheduledPublishTime: Date | null;
};

export type AdminEditablePostRecord = AdminPostRecord & {
  categoryId: string | null;
  layoutType: "standard" | "split-horizontal" | "split-vertical" | "hover" | null;
  contentJson: string;
  featuredImageAlt: string | null;
  seriesId: string | null;
  seriesTitle: string | null;
  seriesOrder: number | null;
  locationName: string | null;
  locationLat: number | null;
  locationLng: number | null;
  locationZoom: number | null;
  iovanderUrl: string | null;
  tags: Array<{ id: string; name: string; slug: string }>;
  galleryImages: Array<{ id: string; imageUrl: string; altText: string | null; sortOrder: number; focalX: number | null; focalY: number | null }>;
};

export type AdminCategoryRecord = {
  id: string;
  name: string;
  slug: string;
};

export type AdminPostCounts = {
  total: number;
  published: number;
  draft: number;
  scheduled: number;
};

export async function listAdminPostRecords(limit = 24): Promise<AdminPostRecord[]> {
  const db = getDb();

  return db
    .select({
      id: posts.id,
      slug: posts.slug,
      title: posts.title,
      status: posts.status,
      excerpt: posts.excerpt,
      category: categories.name,
      imageUrl: mediaAssets.secureUrl,
      createdAt: posts.createdAt,
      publishedAt: posts.publishedAt,
      scheduledPublishTime: posts.scheduledPublishTime,
    })
    .from(posts)
    .leftJoin(categories, eq(posts.categoryId, categories.id))
    .leftJoin(mediaAssets, eq(posts.featuredImageId, mediaAssets.id))
    .orderBy(desc(posts.updatedAt), desc(posts.createdAt))
    .limit(limit);
}

export async function getAdminPostCounts(): Promise<AdminPostCounts> {
  const db = getDb();

  const [countsRow] = await db
    .select({
      total: sql<number>`count(*)`,
      published: sql<number>`sum(case when ${posts.status} = 'published' then 1 else 0 end)`,
      draft: sql<number>`sum(case when ${posts.status} = 'draft' then 1 else 0 end)`,
      scheduled: sql<number>`sum(case when ${posts.status} = 'scheduled' then 1 else 0 end)`,
    })
    .from(posts);

  return {
    total: Number(countsRow?.total ?? 0),
    published: Number(countsRow?.published ?? 0),
    draft: Number(countsRow?.draft ?? 0),
    scheduled: Number(countsRow?.scheduled ?? 0),
  };
}

export async function getAdminEditablePostById(postId: string): Promise<AdminEditablePostRecord | null> {
  const db = getDb();
  const rows = await db
    .select({
      id: posts.id,
      slug: posts.slug,
      title: posts.title,
      status: posts.status,
      excerpt: posts.excerpt,
      category: categories.name,
      categoryId: posts.categoryId,
      imageUrl: mediaAssets.secureUrl,
      featuredImageAlt: mediaAssets.altText,
      createdAt: posts.createdAt,
      publishedAt: posts.publishedAt,
      scheduledPublishTime: posts.scheduledPublishTime,
      layoutType: posts.layoutType,
      contentJson: posts.contentJson,
      seriesId: posts.seriesId,
      seriesTitle: series.title,
      seriesOrder: posts.seriesOrder,
      locationName: posts.locationName,
      locationLat: posts.locationLat,
      locationLng: posts.locationLng,
      locationZoom: posts.locationZoom,
      iovanderUrl: posts.iovanderUrl,
    })
    .from(posts)
    .leftJoin(categories, eq(posts.categoryId, categories.id))
    .leftJoin(mediaAssets, eq(posts.featuredImageId, mediaAssets.id))
    .leftJoin(series, eq(posts.seriesId, series.id))
    .where(eq(posts.id, postId))
    .limit(1);

  const post = rows[0];
  if (!post) {
    return null;
  }

  const [postTagRows, galleryRows] = await Promise.all([
    db
      .select({ id: tags.id, name: tags.name, slug: tags.slug })
      .from(postTags)
      .innerJoin(tags, eq(postTags.tagId, tags.id))
      .where(eq(postTags.postId, postId)),
    db
      .select({ id: postImages.id, imageUrl: mediaAssets.secureUrl, altText: mediaAssets.altText, sortOrder: postImages.sortOrder, focalX: postImages.focalX, focalY: postImages.focalY })
      .from(postImages)
      .innerJoin(mediaAssets, eq(postImages.mediaAssetId, mediaAssets.id))
      .where(eq(postImages.postId, postId))
      .orderBy(postImages.sortOrder),
  ]);

  return {
    ...post,
    featuredImageAlt: post.featuredImageAlt ?? null,
    seriesId: post.seriesId ?? null,
    seriesTitle: post.seriesTitle ?? null,
    seriesOrder: post.seriesOrder ?? null,
    locationName: post.locationName ?? null,
    locationLat: post.locationLat ?? null,
    locationLng: post.locationLng ?? null,
    locationZoom: post.locationZoom ?? null,
    iovanderUrl: post.iovanderUrl ?? null,
    tags: postTagRows,
    galleryImages: galleryRows,
  };
}

export async function listAdminCategories(): Promise<AdminCategoryRecord[]> {
  const db = getDb();
  return db.select({ id: categories.id, name: categories.name, slug: categories.slug }).from(categories).orderBy(categories.name);
}
