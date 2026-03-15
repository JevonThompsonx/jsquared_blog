import "server-only";

import { and, desc, eq } from "drizzle-orm";

import { mediaAssets, postBookmarks, posts } from "@/drizzle/schema";
import { getDb } from "@/lib/db";

export async function isPostBookmarked(postId: string, userId: string): Promise<boolean> {
  const db = getDb();
  const rows = await db
    .select({ postId: postBookmarks.postId })
    .from(postBookmarks)
    .where(and(eq(postBookmarks.postId, postId), eq(postBookmarks.userId, userId)))
    .limit(1);
  return Boolean(rows[0]);
}

export async function togglePostBookmark(postId: string, userId: string): Promise<{ bookmarked: boolean }> {
  const db = getDb();
  const existing = await db
    .select({ postId: postBookmarks.postId })
    .from(postBookmarks)
    .where(and(eq(postBookmarks.postId, postId), eq(postBookmarks.userId, userId)))
    .limit(1);

  if (existing[0]) {
    await db
      .delete(postBookmarks)
      .where(and(eq(postBookmarks.postId, postId), eq(postBookmarks.userId, userId)));
    return { bookmarked: false };
  }

  await db.insert(postBookmarks).values({
    postId,
    userId,
    createdAt: new Date(),
  });
  return { bookmarked: true };
}

export type BookmarkedPost = {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  imageUrl: string | null;
  category: string | null;
  publishedAt: Date | null;
  bookmarkedAt: Date;
};

export async function listBookmarkedPosts(userId: string): Promise<BookmarkedPost[]> {
  const db = getDb();
  const rows = await db
    .select({
      id: posts.id,
      title: posts.title,
      slug: posts.slug,
      excerpt: posts.excerpt,
      imageUrl: mediaAssets.secureUrl,
      publishedAt: posts.publishedAt,
      bookmarkedAt: postBookmarks.createdAt,
    })
    .from(postBookmarks)
    .innerJoin(posts, eq(posts.id, postBookmarks.postId))
    .leftJoin(mediaAssets, eq(mediaAssets.id, posts.featuredImageId))
    .where(and(eq(postBookmarks.userId, userId), eq(posts.status, "published")))
    .orderBy(desc(postBookmarks.createdAt));

  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    slug: row.slug,
    excerpt: row.excerpt,
    imageUrl: row.imageUrl ?? null,
    category: null,
    publishedAt: row.publishedAt,
    bookmarkedAt: row.bookmarkedAt,
  }));
}
