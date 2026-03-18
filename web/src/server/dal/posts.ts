import "server-only";

import { and, count, desc, eq, inArray, ne, sql } from "drizzle-orm";

import { getDb, getDbClient } from "@/lib/db";
import { categories, comments, mediaAssets, postImages, postTags, posts, tags } from "@/drizzle/schema";

let postViewCountColumnPromise: Promise<boolean> | null = null;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export async function hasPostViewCountColumn(): Promise<boolean> {
  if (!postViewCountColumnPromise) {
    postViewCountColumnPromise = getDbClient()
      .execute("PRAGMA table_info('posts')")
      .then((result) => result.rows.some((row) => isRecord(row) && row.name === "view_count"))
      .catch(() => false);
  }

  return postViewCountColumnPromise;
}

function getViewCountSelection(hasViewCount: boolean) {
  return hasViewCount ? posts.viewCount : sql<number>`0`;
}

export type TagRecord = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
};

export type PublishedPostRecord = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  contentJson: string;
  contentFormat: "tiptap-json" | "legacy-html";
  contentHtml: string | null;
  contentPlainText: string | null;
  category: string | null;
  imageUrl: string | null;
  layoutType: "standard" | "split-horizontal" | "split-vertical" | "hover" | null;
  createdAt: Date;
  updatedAt: Date;
  publishedAt: Date | null;
  locationName: string | null;
  locationLat: number | null;
  locationLng: number | null;
  locationZoom: number | null;
  iovanderUrl: string | null;
  viewCount: number;
  authorId?: string;
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
  const hasViewCount = await hasPostViewCountColumn();

  return db
    .select({
      id: posts.id,
      slug: posts.slug,
      title: posts.title,
      excerpt: posts.excerpt,
      contentJson: posts.contentJson,
      contentFormat: posts.contentFormat,
      contentHtml: posts.contentHtml,
      contentPlainText: posts.contentPlainText,
      category: categories.name,
      imageUrl: mediaAssets.secureUrl,
      layoutType: posts.layoutType,
      createdAt: posts.createdAt,
      updatedAt: posts.updatedAt,
      publishedAt: posts.publishedAt,
      locationName: posts.locationName,
      locationLat: posts.locationLat,
      locationLng: posts.locationLng,
      locationZoom: posts.locationZoom,
      iovanderUrl: posts.iovanderUrl,
      viewCount: getViewCountSelection(hasViewCount),
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
  const hasViewCount = await hasPostViewCountColumn();

  return db
    .select({
      id: posts.id,
      slug: posts.slug,
      title: posts.title,
      excerpt: posts.excerpt,
      contentJson: posts.contentJson,
      contentFormat: posts.contentFormat,
      contentHtml: posts.contentHtml,
      contentPlainText: posts.contentPlainText,
      category: categories.name,
      imageUrl: mediaAssets.secureUrl,
      layoutType: posts.layoutType,
      createdAt: posts.createdAt,
      updatedAt: posts.updatedAt,
      publishedAt: posts.publishedAt,
      locationName: posts.locationName,
      locationLat: posts.locationLat,
      locationLng: posts.locationLng,
      locationZoom: posts.locationZoom,
      iovanderUrl: posts.iovanderUrl,
      viewCount: getViewCountSelection(hasViewCount),
    })
    .from(posts)
    .leftJoin(categories, eq(posts.categoryId, categories.id))
    .leftJoin(mediaAssets, eq(posts.featuredImageId, mediaAssets.id))
    .where(eq(posts.status, "published"))
    .orderBy(desc(posts.publishedAt), desc(posts.createdAt));
}

export async function listRecentPublishedPostRecords(limit: number, excludePostId?: string): Promise<PublishedPostRecord[]> {
  const db = getDb();
  const hasViewCount = await hasPostViewCountColumn();
  const whereClause = excludePostId
    ? and(eq(posts.status, "published"), ne(posts.id, excludePostId))
    : eq(posts.status, "published");

  return db
    .select({
      id: posts.id,
      slug: posts.slug,
      title: posts.title,
      excerpt: posts.excerpt,
      contentJson: posts.contentJson,
      contentFormat: posts.contentFormat,
      contentHtml: posts.contentHtml,
      contentPlainText: posts.contentPlainText,
      category: categories.name,
      imageUrl: mediaAssets.secureUrl,
      layoutType: posts.layoutType,
      createdAt: posts.createdAt,
      updatedAt: posts.updatedAt,
      publishedAt: posts.publishedAt,
      locationName: posts.locationName,
      locationLat: posts.locationLat,
      locationLng: posts.locationLng,
      locationZoom: posts.locationZoom,
      iovanderUrl: posts.iovanderUrl,
      viewCount: getViewCountSelection(hasViewCount),
    })
    .from(posts)
    .leftJoin(categories, eq(posts.categoryId, categories.id))
    .leftJoin(mediaAssets, eq(posts.featuredImageId, mediaAssets.id))
    .where(whereClause)
    .orderBy(desc(posts.publishedAt), desc(posts.createdAt))
    .limit(limit);
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

export async function listCommentCountsByPostIds(postIds: string[]): Promise<Map<string, number>> {
  if (postIds.length === 0) {
    return new Map();
  }

  const db = getDb();
  const rows = await db
    .select({ postId: comments.postId, commentCount: count(comments.id) })
    .from(comments)
    .where(inArray(comments.postId, postIds))
    .groupBy(comments.postId);

  return new Map(rows.map((row) => [row.postId, row.commentCount]));
}

function getPostDetailSelect(hasViewCount: boolean) {
  return {
  id: posts.id,
  slug: posts.slug,
  title: posts.title,
  excerpt: posts.excerpt,
  contentJson: posts.contentJson,
  contentFormat: posts.contentFormat,
  contentHtml: posts.contentHtml,
  contentPlainText: posts.contentPlainText,
  category: categories.name,
  imageUrl: mediaAssets.secureUrl,
  layoutType: posts.layoutType,
  createdAt: posts.createdAt,
  updatedAt: posts.updatedAt,
  publishedAt: posts.publishedAt,
  locationName: posts.locationName,
  locationLat: posts.locationLat,
  locationLng: posts.locationLng,
  locationZoom: posts.locationZoom,
  iovanderUrl: posts.iovanderUrl,
  viewCount: getViewCountSelection(hasViewCount),
  authorId: posts.authorId,
  };
}

export async function getPublishedPostRecordBySlug(slug: string): Promise<PublishedPostRecord | null> {
  const db = getDb();
  const hasViewCount = await hasPostViewCountColumn();
  const postDetailSelect = getPostDetailSelect(hasViewCount);

  // Exact match (fast, indexed)
  const exactRows = await db
    .select(postDetailSelect)
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
    .select(postDetailSelect)
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
    .select({ id: tags.id, name: tags.name, slug: tags.slug, description: tags.description })
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
  const hasViewCount = await hasPostViewCountColumn();
  return db
    .select({
      id: posts.id,
      slug: posts.slug,
      title: posts.title,
      excerpt: posts.excerpt,
      contentJson: posts.contentJson,
      contentFormat: posts.contentFormat,
      contentHtml: posts.contentHtml,
      contentPlainText: posts.contentPlainText,
      category: categories.name,
      imageUrl: mediaAssets.secureUrl,
      layoutType: posts.layoutType,
      createdAt: posts.createdAt,
      updatedAt: posts.updatedAt,
      publishedAt: posts.publishedAt,
      locationName: posts.locationName,
      locationLat: posts.locationLat,
      locationLng: posts.locationLng,
      locationZoom: posts.locationZoom,
      iovanderUrl: posts.iovanderUrl,
      viewCount: getViewCountSelection(hasViewCount),
    })
    .from(posts)
    .innerJoin(categories, eq(posts.categoryId, categories.id))
    .leftJoin(mediaAssets, eq(posts.featuredImageId, mediaAssets.id))
    .where(and(eq(posts.status, "published"), eq(categories.name, category)))
    .orderBy(desc(posts.publishedAt), desc(posts.createdAt))
    .offset(offset)
    .limit(limit);
}

export async function countPublishedPostsByCategory(category: string): Promise<number> {
  const db = getDb();
  const rows = await db
    .select({ n: count() })
    .from(posts)
    .innerJoin(categories, eq(posts.categoryId, categories.id))
    .where(and(eq(posts.status, "published"), eq(categories.name, category)));
  return Number(rows[0]?.n ?? 0);
}

export async function listPublishedPostRecordsByTagSlug(
  tagSlug: string,
  limit: number,
  offset = 0,
): Promise<PublishedPostRecord[]> {
  const db = getDb();
  const hasViewCount = await hasPostViewCountColumn();
  return db
    .select({
      id: posts.id,
      slug: posts.slug,
      title: posts.title,
      excerpt: posts.excerpt,
      contentJson: posts.contentJson,
      contentFormat: posts.contentFormat,
      contentHtml: posts.contentHtml,
      contentPlainText: posts.contentPlainText,
      category: categories.name,
      imageUrl: mediaAssets.secureUrl,
      layoutType: posts.layoutType,
      createdAt: posts.createdAt,
      updatedAt: posts.updatedAt,
      publishedAt: posts.publishedAt,
      locationName: posts.locationName,
      locationLat: posts.locationLat,
      locationLng: posts.locationLng,
      locationZoom: posts.locationZoom,
      iovanderUrl: posts.iovanderUrl,
      viewCount: getViewCountSelection(hasViewCount),
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

export async function listPublishedPostRecordsByTagSlugs(
  tagSlugs: string[],
  limit: number,
  excludePostId?: string,
): Promise<PublishedPostRecord[]> {
  if (tagSlugs.length === 0) {
    return [];
  }

  const db = getDb();
  const hasViewCount = await hasPostViewCountColumn();
  const whereClause = excludePostId
    ? and(eq(posts.status, "published"), inArray(tags.slug, tagSlugs), ne(posts.id, excludePostId))
    : and(eq(posts.status, "published"), inArray(tags.slug, tagSlugs));

  return db
    .selectDistinct({
      id: posts.id,
      slug: posts.slug,
      title: posts.title,
      excerpt: posts.excerpt,
      contentJson: posts.contentJson,
      contentFormat: posts.contentFormat,
      contentHtml: posts.contentHtml,
      contentPlainText: posts.contentPlainText,
      category: categories.name,
      imageUrl: mediaAssets.secureUrl,
      layoutType: posts.layoutType,
      createdAt: posts.createdAt,
      updatedAt: posts.updatedAt,
      publishedAt: posts.publishedAt,
      locationName: posts.locationName,
      locationLat: posts.locationLat,
      locationLng: posts.locationLng,
      locationZoom: posts.locationZoom,
      iovanderUrl: posts.iovanderUrl,
      viewCount: getViewCountSelection(hasViewCount),
    })
    .from(posts)
    .innerJoin(postTags, eq(postTags.postId, posts.id))
    .innerJoin(tags, eq(postTags.tagId, tags.id))
    .leftJoin(categories, eq(posts.categoryId, categories.id))
    .leftJoin(mediaAssets, eq(posts.featuredImageId, mediaAssets.id))
    .where(whereClause)
    .orderBy(desc(posts.publishedAt), desc(posts.createdAt))
    .limit(limit);
}

export async function countPublishedPostsByTagSlug(tagSlug: string): Promise<number> {
  const db = getDb();
  const rows = await db
    .select({ n: count() })
    .from(posts)
    .innerJoin(postTags, eq(postTags.postId, posts.id))
    .innerJoin(tags, eq(postTags.tagId, tags.id))
    .where(and(eq(posts.status, "published"), eq(tags.slug, tagSlug)));
  return Number(rows[0]?.n ?? 0);
}

export type AnyStatusPostRecord = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  contentJson: string;
  contentFormat: "tiptap-json" | "legacy-html";
  contentHtml: string | null;
  contentPlainText: string | null;
  status: "draft" | "published" | "scheduled";
  scheduledPublishTime: Date | null;
  category: string | null;
  imageUrl: string | null;
  layoutType: "standard" | "split-horizontal" | "split-vertical" | "hover" | null;
  createdAt: Date;
  updatedAt: Date;
  publishedAt: Date | null;
  locationName: string | null;
  locationLat: number | null;
  locationLng: number | null;
  locationZoom: number | null;
  iovanderUrl: string | null;
  viewCount: number;
  authorId: string;
};

export async function getAnyPostRecordById(id: string): Promise<AnyStatusPostRecord | null> {
  const db = getDb();
  const hasViewCount = await hasPostViewCountColumn();

  const rows = await db
    .select({
      id: posts.id,
      slug: posts.slug,
      title: posts.title,
      excerpt: posts.excerpt,
      contentJson: posts.contentJson,
      contentFormat: posts.contentFormat,
      contentHtml: posts.contentHtml,
      contentPlainText: posts.contentPlainText,
      status: posts.status,
      scheduledPublishTime: posts.scheduledPublishTime,
      category: categories.name,
      imageUrl: mediaAssets.secureUrl,
      layoutType: posts.layoutType,
      createdAt: posts.createdAt,
      updatedAt: posts.updatedAt,
      publishedAt: posts.publishedAt,
      locationName: posts.locationName,
      locationLat: posts.locationLat,
      locationLng: posts.locationLng,
      locationZoom: posts.locationZoom,
      iovanderUrl: posts.iovanderUrl,
      viewCount: getViewCountSelection(hasViewCount),
      authorId: posts.authorId,
    })
    .from(posts)
    .leftJoin(categories, eq(posts.categoryId, categories.id))
    .leftJoin(mediaAssets, eq(posts.featuredImageId, mediaAssets.id))
    .where(eq(posts.id, id))
    .limit(1);

  return rows[0] ?? null;
}

export async function schedulePost(postId: string, scheduledAt: Date): Promise<void> {
  const db = getDb();
  await db
    .update(posts)
    .set({ status: "scheduled", scheduledPublishTime: scheduledAt, updatedAt: new Date() })
    .where(eq(posts.id, postId));
}

export async function unschedulePost(postId: string): Promise<void> {
  const db = getDb();
  await db
    .update(posts)
    .set({ status: "draft", scheduledPublishTime: null, updatedAt: new Date() })
    .where(eq(posts.id, postId));
}

export async function incrementPostViewCount(postId: string): Promise<void> {
  if (!(await hasPostViewCountColumn())) {
    return;
  }

  const db = getDb();

  await db
    .update(posts)
    .set({
      viewCount: sql`${posts.viewCount} + 1`,
    })
    .where(and(eq(posts.id, postId), eq(posts.status, "published")));
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
