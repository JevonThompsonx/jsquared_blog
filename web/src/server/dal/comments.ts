import "server-only";

import { and, count, desc, eq, inArray } from "drizzle-orm";

import { commentLikes, comments, posts, profiles } from "@/drizzle/schema";
import { getDb } from "@/lib/db";
import type { CommentSortOption } from "@/server/forms/comments";

export type CommentRecord = {
  id: string;
  postId: string;
  authorId: string;
  authorDisplayName: string;
  authorAvatarUrl: string | null;
  content: string;
  parentId: string | null;
  createdAt: Date;
  updatedAt: Date;
  likeCount: number;
  userHasLiked: boolean;
  canDelete: boolean;
};

function sortComments(records: CommentRecord[], sortBy: CommentSortOption): CommentRecord[] {
  const sorted = [...records];
  if (sortBy === "likes") {
    sorted.sort((left, right) => {
      if (right.likeCount !== left.likeCount) {
        return right.likeCount - left.likeCount;
      }

      return right.createdAt.getTime() - left.createdAt.getTime();
    });
    return sorted;
  }

  if (sortBy === "oldest") {
    sorted.sort((left, right) => left.createdAt.getTime() - right.createdAt.getTime());
    return sorted;
  }

  sorted.sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime());
  return sorted;
}

export async function listCommentsForPost(postId: string, currentUserId: string | null, sortBy: CommentSortOption): Promise<CommentRecord[]> {
  const db = getDb();
  const rows = await db
    .select({
      id: comments.id,
      postId: comments.postId,
      authorId: comments.authorId,
      authorDisplayName: profiles.displayName,
      authorAvatarUrl: profiles.avatarUrl,
      content: comments.content,
      parentId: comments.parentId,
      createdAt: comments.createdAt,
      updatedAt: comments.updatedAt,
    })
    .from(comments)
    .leftJoin(profiles, eq(profiles.userId, comments.authorId))
    .where(eq(comments.postId, postId))
    .orderBy(desc(comments.createdAt));

  if (rows.length === 0) {
    return [];
  }

  const commentIds = rows.map((row) => row.id);
  const likeRows = await db
    .select({
      commentId: commentLikes.commentId,
      userId: commentLikes.userId,
    })
    .from(commentLikes)
    .where(inArray(commentLikes.commentId, commentIds));

  const likeCountMap = new Map<string, number>();
  const likedByCurrentUser = new Set<string>();

  for (const row of likeRows) {
    likeCountMap.set(row.commentId, (likeCountMap.get(row.commentId) ?? 0) + 1);
    if (currentUserId && row.userId === currentUserId) {
      likedByCurrentUser.add(row.commentId);
    }
  }

  return sortComments(rows.map((row) => ({
    id: row.id,
    postId: row.postId,
    authorId: row.authorId,
    authorDisplayName: row.authorDisplayName ?? "Traveler",
    authorAvatarUrl: row.authorAvatarUrl ?? null,
    content: row.content,
    parentId: row.parentId ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    likeCount: likeCountMap.get(row.id) ?? 0,
    userHasLiked: likedByCurrentUser.has(row.id),
    canDelete: currentUserId === row.authorId,
  })), sortBy);
}

export type UserCommentSummary = {
  id: string;
  content: string;
  parentId: string | null;
  createdAt: Date;
  likeCount: number;
  post: { id: string; title: string; slug: string };
};

export async function listCommentsByUserId(userId: string, limit = 20): Promise<UserCommentSummary[]> {
  const db = getDb();
  const rows = await db
    .select({
      id: comments.id,
      content: comments.content,
      parentId: comments.parentId,
      createdAt: comments.createdAt,
      postId: posts.id,
      postTitle: posts.title,
      postSlug: posts.slug,
    })
    .from(comments)
    .innerJoin(posts, eq(posts.id, comments.postId))
    .where(and(eq(comments.authorId, userId), eq(posts.status, "published")))
    .orderBy(desc(comments.createdAt))
    .limit(limit);

  if (rows.length === 0) return [];

  const commentIds = rows.map((r) => r.id);
  const likeRows = await db
    .select({ commentId: commentLikes.commentId })
    .from(commentLikes)
    .where(inArray(commentLikes.commentId, commentIds));

  const likeCountMap = new Map<string, number>();
  for (const row of likeRows) {
    likeCountMap.set(row.commentId, (likeCountMap.get(row.commentId) ?? 0) + 1);
  }

  return rows.map((row) => ({
    id: row.id,
    content: row.content,
    parentId: row.parentId,
    createdAt: row.createdAt,
    likeCount: likeCountMap.get(row.id) ?? 0,
    post: { id: row.postId, title: row.postTitle, slug: row.postSlug },
  }));
}

export async function countCommentsByUserId(userId: string): Promise<number> {
  const db = getDb();
  const rows = await db
    .select({ total: count() })
    .from(comments)
    .where(eq(comments.authorId, userId));
  return rows[0]?.total ?? 0;
}

export async function canCommentOnPost(postId: string): Promise<boolean> {
  const db = getDb();
  const rows = await db
    .select({ id: posts.id })
    .from(posts)
    .where(and(eq(posts.id, postId), eq(posts.status, "published")))
    .limit(1);

  return Boolean(rows[0]);
}

export async function createCommentRecord(postId: string, authorId: string, content: string, parentId: string | null = null): Promise<void> {
  const db = getDb();
  const timestamp = new Date();

  await db.insert(comments).values({
    id: crypto.randomUUID(),
    postId,
    authorId,
    content,
    parentId,
    createdAt: timestamp,
    updatedAt: timestamp,
  });
}

export async function deleteCommentRecord(commentId: string, authorId: string): Promise<boolean> {
  const db = getDb();
  const existing = await db
    .select({ id: comments.id })
    .from(comments)
    .where(and(eq(comments.id, commentId), eq(comments.authorId, authorId)))
    .limit(1);

  if (!existing[0]) {
    return false;
  }

  await db.transaction(async (tx) => {
    await tx.delete(commentLikes).where(eq(commentLikes.commentId, commentId));
    await tx.delete(comments).where(eq(comments.id, commentId));
  });

  return true;
}

export async function toggleCommentLikeRecord(commentId: string, userId: string): Promise<{ liked: boolean }> {
  const db = getDb();
  const existing = await db
    .select({ commentId: commentLikes.commentId })
    .from(commentLikes)
    .where(and(eq(commentLikes.commentId, commentId), eq(commentLikes.userId, userId)))
    .limit(1);

  if (existing[0]) {
    await db.delete(commentLikes).where(and(eq(commentLikes.commentId, commentId), eq(commentLikes.userId, userId)));
    return { liked: false };
  }

  await db.insert(commentLikes).values({
    commentId,
    userId,
  });

  return { liked: true };
}

export async function commentExists(commentId: string): Promise<boolean> {
  const db = getDb();
  const rows = await db.select({ id: comments.id }).from(comments).where(eq(comments.id, commentId)).limit(1);
  return Boolean(rows[0]);
}
