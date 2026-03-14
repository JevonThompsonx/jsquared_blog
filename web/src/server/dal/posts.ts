import "server-only";

import { and, desc, eq, inArray } from "drizzle-orm";

import { getDb } from "@/lib/db";
import { categories, mediaAssets, postImages, postTags, posts, tags } from "@/drizzle/schema";

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
    })
    .from(posts)
    .leftJoin(categories, eq(posts.categoryId, categories.id))
    .leftJoin(mediaAssets, eq(posts.featuredImageId, mediaAssets.id))
    .where(eq(posts.status, "published"))
    .orderBy(desc(posts.publishedAt), desc(posts.createdAt))
    .offset(offset)
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

export async function getPublishedPostRecordBySlug(slug: string): Promise<PublishedPostRecord | null> {
  const db = getDb();

  const rows = await db
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
    })
    .from(posts)
    .leftJoin(categories, eq(posts.categoryId, categories.id))
    .leftJoin(mediaAssets, eq(posts.featuredImageId, mediaAssets.id))
    .where(and(eq(posts.slug, slug), eq(posts.status, "published")))
    .limit(1);

  return rows[0] ?? null;
}

export async function listTagsForPost(postId: string): Promise<PublishedPostTagRecord[]> {
  return listTagsByPostIds([postId]);
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
