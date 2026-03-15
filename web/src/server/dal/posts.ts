import "server-only";

import { and, desc, eq, inArray, sql } from "drizzle-orm";

import { getDb } from "@/lib/db";
import { categories, mediaAssets, postImages, postTags, posts, tags } from "@/drizzle/schema";

export type TagRecord = {
  id: string;
  name: string;
  slug: string;
};

export type PublishedPostRecord = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  contentJson: string;
  category: string | null;
  imageUrl: string | null;
  layoutType: "standard" | "split-horizontal" | "split-vertical" | "hover" | null;
  createdAt: Date;
  publishedAt: Date | null;
  locationName: string | null;
  locationLat: number | null;
  locationLng: number | null;
  locationZoom: number | null;
  iovanderUrl: string | null;
};

export type PublishedPostTagRecord = {
  postId: string;
  tagId: string;
  name: string;
  slug: string;
};

export type PublishedPostImageRecord = {
  id: string;
  imageUrl: string;
  altText: string | null;
  sortOrder: number;
};

export async function listPublishedPostRecords(limit: number, offset = 0): Promise<PublishedPostRecord[]> {
  const db = getDb();

  return db
    .select({
      id: posts.id,
      slug: posts.slug,
      title: posts.title,
      excerpt: posts.excerpt,
      contentJson: posts.contentJson,
      category: categories.name,
      imageUrl: mediaAssets.secureUrl,
      layoutType: posts.layoutType,
      createdAt: posts.createdAt,
      publishedAt: posts.publishedAt,
      locationName: posts.locationName,
      locationLat: posts.locationLat,
      locationLng: posts.locationLng,
      locationZoom: posts.locationZoom,
      iovanderUrl: posts.iovanderUrl,
    })
    .from(posts)
    .leftJoin(categories, eq(posts.categoryId, categories.id))
    .leftJoin(mediaAssets, eq(posts.featuredImageId, mediaAssets.id))
    .where(eq(posts.status, "published"))
    .orderBy(desc(posts.publishedAt), desc(posts.createdAt))
    .offset(offset)
    .limit(limit);
}

export async function listAllPublishedPostRecords(): Promise<PublishedPostRecord[]> {
  const db = getDb();

  return db
    .select({
      id: posts.id,
      slug: posts.slug,
      title: posts.title,
      excerpt: posts.excerpt,
      contentJson: posts.contentJson,
      category: categories.name,
      imageUrl: mediaAssets.secureUrl,
      layoutType: posts.layoutType,
      createdAt: posts.createdAt,
      publishedAt: posts.publishedAt,
      locationName: posts.locationName,
      locationLat: posts.locationLat,
      locationLng: posts.locationLng,
      locationZoom: posts.locationZoom,
      iovanderUrl: posts.iovanderUrl,
    })
    .from(posts)
    .leftJoin(categories, eq(posts.categoryId, categories.id))
    .leftJoin(mediaAssets, eq(posts.featuredImageId, mediaAssets.id))
    .where(eq(posts.status, "published"))
    .orderBy(desc(posts.publishedAt), desc(posts.createdAt));
}

export async function listTagsByPostIds(postIds: string[]): Promise<PublishedPostTagRecord[]> {
  if (postIds.length === 0) {
    return [];
  }

  const db = getDb();

  return db
    .select({
      postId: postTags.postId,
      tagId: tags.id,
      name: tags.name,
      slug: tags.slug,
    })
    .from(postTags)
    .innerJoin(tags, eq(postTags.tagId, tags.id))
    .where(inArray(postTags.postId, postIds));
}

const POST_DETAIL_SELECT = {
  id: posts.id,
  slug: posts.slug,
  title: posts.title,
  excerpt: posts.excerpt,
  contentJson: posts.contentJson,
  category: categories.name,
  imageUrl: mediaAssets.secureUrl,
  layoutType: posts.layoutType,
  createdAt: posts.createdAt,
  publishedAt: posts.publishedAt,
  locationName: posts.locationName,
  locationLat: posts.locationLat,
  locationLng: posts.locationLng,
  locationZoom: posts.locationZoom,
  iovanderUrl: posts.iovanderUrl,
} as const;

export async function getPublishedPostRecordBySlug(slug: string): Promise<PublishedPostRecord | null> {
  const db = getDb();

  // Exact match (fast, indexed)
  const exactRows = await db
    .select(POST_DETAIL_SELECT)
    .from(posts)
    .leftJoin(categories, eq(posts.categoryId, categories.id))
    .leftJoin(mediaAssets, eq(posts.featuredImageId, mediaAssets.id))
    .where(and(eq(posts.slug, slug), eq(posts.status, "published")))
    .limit(1);

  if (exactRows[0]) {
    return exactRows[0];
  }

  // Normalized fallback: DB slugs with spaces/uppercase (e.g. "post post" → "post-post")
  const normalizedRows = await db
    .select(POST_DETAIL_SELECT)
    .from(posts)
    .leftJoin(categories, eq(posts.categoryId, categories.id))
    .leftJoin(mediaAssets, eq(posts.featuredImageId, mediaAssets.id))
    .where(
      and(
        sql`LOWER(REPLACE(REPLACE(${posts.slug}, ' ', '-'), '_', '-')) = ${slug}`,
        eq(posts.status, "published"),
      ),
    )
    .limit(1);

  return normalizedRows[0] ?? null;
}

export async function listTagsForPost(postId: string): Promise<PublishedPostTagRecord[]> {
  return listTagsByPostIds([postId]);
}

export async function getTagBySlug(slug: string): Promise<TagRecord | null> {
  const db = getDb();
  const rows = await db
    .select({ id: tags.id, name: tags.name, slug: tags.slug })
    .from(tags)
    .where(eq(tags.slug, slug))
    .limit(1);
  return rows[0] ?? null;
}

export async function listPublishedPostRecordsByCategory(
  category: string,
  limit: number,
  offset = 0,
): Promise<PublishedPostRecord[]> {
  const db = getDb();
  return db
    .select({
      id: posts.id,
      slug: posts.slug,
      title: posts.title,
      excerpt: posts.excerpt,
      contentJson: posts.contentJson,
      category: categories.name,
      imageUrl: mediaAssets.secureUrl,
      layoutType: posts.layoutType,
      createdAt: posts.createdAt,
      publishedAt: posts.publishedAt,
      locationName: posts.locationName,
      locationLat: posts.locationLat,
      locationLng: posts.locationLng,
      locationZoom: posts.locationZoom,
      iovanderUrl: posts.iovanderUrl,
    })
    .from(posts)
    .innerJoin(categories, eq(posts.categoryId, categories.id))
    .leftJoin(mediaAssets, eq(posts.featuredImageId, mediaAssets.id))
    .where(and(eq(posts.status, "published"), eq(categories.name, category)))
    .orderBy(desc(posts.publishedAt), desc(posts.createdAt))
    .offset(offset)
    .limit(limit);
}

export async function listPublishedPostRecordsByTagSlug(
  tagSlug: string,
  limit: number,
  offset = 0,
): Promise<PublishedPostRecord[]> {
  const db = getDb();
  return db
    .select({
      id: posts.id,
      slug: posts.slug,
      title: posts.title,
      excerpt: posts.excerpt,
      contentJson: posts.contentJson,
      category: categories.name,
      imageUrl: mediaAssets.secureUrl,
      layoutType: posts.layoutType,
      createdAt: posts.createdAt,
      publishedAt: posts.publishedAt,
      locationName: posts.locationName,
      locationLat: posts.locationLat,
      locationLng: posts.locationLng,
      locationZoom: posts.locationZoom,
      iovanderUrl: posts.iovanderUrl,
    })
    .from(posts)
    .innerJoin(postTags, eq(postTags.postId, posts.id))
    .innerJoin(tags, eq(postTags.tagId, tags.id))
    .leftJoin(categories, eq(posts.categoryId, categories.id))
    .leftJoin(mediaAssets, eq(posts.featuredImageId, mediaAssets.id))
    .where(and(eq(posts.status, "published"), eq(tags.slug, tagSlug)))
    .orderBy(desc(posts.publishedAt), desc(posts.createdAt))
    .offset(offset)
    .limit(limit);
}

export async function listImagesForPost(postId: string): Promise<PublishedPostImageRecord[]> {
  const db = getDb();

  return db
    .select({
      id: postImages.id,
      imageUrl: mediaAssets.secureUrl,
      altText: mediaAssets.altText,
      sortOrder: postImages.sortOrder,
    })
    .from(postImages)
    .innerJoin(mediaAssets, eq(postImages.mediaAssetId, mediaAssets.id))
    .where(eq(postImages.postId, postId))
    .orderBy(postImages.sortOrder);
}
