import "server-only";

import { and, count, desc, eq, inArray } from "drizzle-orm";

import { commentLikes, comments, posts, profiles } from "@/drizzle/schema";
import { getDb } from "@/lib/db";
import type {
  CommentModerationAction,
  CommentSortOption,
  CommentVisibility,
} from "@/server/forms/comments";

const COMMENT_VISIBILITY_VISIBLE: CommentVisibility = "visible";
const COMMENT_VISIBILITY_HIDDEN: CommentVisibility = "hidden";
const COMMENT_VISIBILITY_DELETED: CommentVisibility = "deleted";

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
  visibility: CommentVisibility;
  isFlagged: boolean;
  moderatedAt: Date | null;
  moderatedByUserId: string | null;
  canLike: boolean;
};

export type AdminCommentRecord = CommentRecord;

export type UserCommentSummary = {
  id: string;
  content: string;
  parentId: string | null;
  createdAt: Date;
  likeCount: number;
  post: { id: string; title: string; slug: string };
};

export type CommentNotificationRecord = {
  id: string;
  content: string;
  parentId: string | null;
  createdAt: Date;
  authorDisplayName: string;
  post: {
    id: string;
    title: string;
    slug: string;
  };
};

export type CommentModerationItemResult = {
  commentId: string;
  postId: string;
  visibility: CommentVisibility;
  isFlagged: boolean;
  moderatedAt: string | null;
  moderatedByUserId: string | null;
  changed: boolean;
};

export type CommentModerationResult = {
  action: CommentModerationAction;
  updatedCount: number;
  unchangedCount: number;
  missingIds: string[];
  comments: CommentModerationItemResult[];
};

type RawCommentRow = {
  id: string;
  postId: string;
  authorId: string;
  authorDisplayName: string | null;
  authorAvatarUrl: string | null;
  content: string;
  parentId: string | null;
  createdAt: Date;
  updatedAt: Date;
  visibility: CommentVisibility;
  isFlagged: boolean;
  moderatedAt: Date | null;
  moderatedByUserId: string | null;
};

function sortComments<T extends { createdAt: Date; likeCount: number }>(records: T[], sortBy: CommentSortOption): T[] {
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

export function getPublicCommentContent(content: string, visibility: CommentVisibility): string {
  if (visibility === COMMENT_VISIBILITY_HIDDEN) {
    return "This comment is hidden by an admin.";
  }

  if (visibility === COMMENT_VISIBILITY_DELETED) {
    return "This comment has been deleted.";
  }

  return content;
}

function toCommentModerationItemResult(comment: Pick<
  RawCommentRow,
  "id" | "postId" | "visibility" | "isFlagged" | "moderatedAt" | "moderatedByUserId"
> & { changed: boolean }): CommentModerationItemResult {
  return {
    commentId: comment.id,
    postId: comment.postId,
    visibility: comment.visibility,
    isFlagged: comment.isFlagged,
    moderatedAt: comment.moderatedAt ? comment.moderatedAt.toISOString() : null,
    moderatedByUserId: comment.moderatedByUserId,
    changed: comment.changed,
  };
}

async function listCommentRowsForPost(postId: string): Promise<RawCommentRow[]> {
  const db = getDb();
  return db
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
      visibility: comments.visibility,
      isFlagged: comments.isFlagged,
      moderatedAt: comments.moderatedAt,
      moderatedByUserId: comments.moderatedByUserId,
    })
    .from(comments)
    .leftJoin(profiles, eq(profiles.userId, comments.authorId))
    .where(eq(comments.postId, postId))
    .orderBy(desc(comments.createdAt));
}

async function buildCommentRecords(
  rows: RawCommentRow[],
  currentUserId: string | null,
  sortBy: CommentSortOption,
  includeModeratedContent: boolean,
): Promise<CommentRecord[]> {
  if (rows.length === 0) {
    return [];
  }

  const db = getDb();
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

  return sortComments(
    rows.map((row) => ({
      id: row.id,
      postId: row.postId,
      authorId: row.authorId,
      authorDisplayName: row.authorDisplayName ?? "Traveler",
      authorAvatarUrl: row.authorAvatarUrl ?? null,
      content: includeModeratedContent ? row.content : getPublicCommentContent(row.content, row.visibility),
      parentId: row.parentId ?? null,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      likeCount: likeCountMap.get(row.id) ?? 0,
      userHasLiked: row.visibility === COMMENT_VISIBILITY_VISIBLE && likedByCurrentUser.has(row.id),
      canDelete: currentUserId === row.authorId && row.visibility === COMMENT_VISIBILITY_VISIBLE,
      visibility: row.visibility,
      isFlagged: row.isFlagged,
      moderatedAt: row.moderatedAt,
      moderatedByUserId: row.moderatedByUserId,
      canLike: row.visibility === COMMENT_VISIBILITY_VISIBLE,
    })),
    sortBy,
  );
}

export async function listCommentsForPost(
  postId: string,
  currentUserId: string | null,
  sortBy: CommentSortOption,
): Promise<CommentRecord[]> {
  const rows = await listCommentRowsForPost(postId);
  return buildCommentRecords(rows, currentUserId, sortBy, false);
}

export async function listCommentsForAdmin(postId: string, sortBy: CommentSortOption): Promise<AdminCommentRecord[]> {
  const rows = await listCommentRowsForPost(postId);
  return buildCommentRecords(rows, null, sortBy, true);
}

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
    .where(
      and(
        eq(comments.authorId, userId),
        eq(comments.visibility, COMMENT_VISIBILITY_VISIBLE),
        eq(posts.status, "published"),
      ),
    )
    .orderBy(desc(comments.createdAt))
    .limit(limit);

  if (rows.length === 0) {
    return [];
  }

  const commentIds = rows.map((row) => row.id);
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
    .where(and(eq(comments.authorId, userId), eq(comments.visibility, COMMENT_VISIBILITY_VISIBLE)));
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

export async function canReplyToComment(postId: string, parentId: string): Promise<boolean> {
  const db = getDb();
  const rows = await db
    .select({ id: comments.id, parentId: comments.parentId })
    .from(comments)
    .where(
      and(
        eq(comments.id, parentId),
        eq(comments.postId, postId),
        eq(comments.visibility, COMMENT_VISIBILITY_VISIBLE),
      ),
    )
    .limit(1);

  return Boolean(rows[0]) && rows[0].parentId === null;
}

export async function createCommentRecord(
  postId: string,
  authorId: string,
  content: string,
  parentId: string | null = null,
): Promise<CommentNotificationRecord> {
  const db = getDb();
  const timestamp = new Date();
  const commentId = crypto.randomUUID();

  await db.insert(comments).values({
    id: commentId,
    postId,
    authorId,
    content,
    parentId,
    visibility: COMMENT_VISIBILITY_VISIBLE,
    isFlagged: false,
    moderatedAt: null,
    moderatedByUserId: null,
    createdAt: timestamp,
    updatedAt: timestamp,
  });

  const rows = await db
    .select({
      id: comments.id,
      content: comments.content,
      parentId: comments.parentId,
      createdAt: comments.createdAt,
      authorDisplayName: profiles.displayName,
      postId: posts.id,
      postTitle: posts.title,
      postSlug: posts.slug,
    })
    .from(comments)
    .innerJoin(posts, eq(posts.id, comments.postId))
    .leftJoin(profiles, eq(profiles.userId, comments.authorId))
    .where(eq(comments.id, commentId))
    .limit(1);

  const row = rows[0];
  if (!row) {
    throw new Error("Failed to load created comment record");
  }

  return {
    id: row.id,
    content: row.content,
    parentId: row.parentId,
    createdAt: row.createdAt,
    authorDisplayName: row.authorDisplayName ?? "Traveler",
    post: {
      id: row.postId,
      title: row.postTitle,
      slug: row.postSlug,
    },
  };
}

export async function deleteCommentRecord(commentId: string, authorId: string): Promise<boolean> {
  const db = getDb();
  const existing = await db
    .select({ id: comments.id, visibility: comments.visibility })
    .from(comments)
    .where(and(eq(comments.id, commentId), eq(comments.authorId, authorId)))
    .limit(1);

  if (!existing[0] || existing[0].visibility !== COMMENT_VISIBILITY_VISIBLE) {
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
  const rows = await db
    .select({ id: comments.id })
    .from(comments)
    .where(and(eq(comments.id, commentId), eq(comments.visibility, COMMENT_VISIBILITY_VISIBLE)))
    .limit(1);
  return Boolean(rows[0]);
}

export function applyCommentModerationAction(
  action: CommentModerationAction,
  existing: Pick<RawCommentRow, "visibility" | "isFlagged">,
): {
  changed: boolean;
  visibility: CommentVisibility;
  isFlagged: boolean;
} {
  if (action === "hide") {
    const nextVisibility = COMMENT_VISIBILITY_HIDDEN;
    return {
      changed: existing.visibility !== nextVisibility || existing.isFlagged,
      visibility: nextVisibility,
      isFlagged: false,
    };
  }

  if (action === "unhide") {
    const nextVisibility = COMMENT_VISIBILITY_VISIBLE;
    return {
      changed: existing.visibility !== nextVisibility,
      visibility: nextVisibility,
      isFlagged: existing.isFlagged,
    };
  }

  if (action === "delete") {
    const nextVisibility = COMMENT_VISIBILITY_DELETED;
    return {
      changed: existing.visibility !== nextVisibility,
      visibility: nextVisibility,
      isFlagged: false,
    };
  }

  if (action === "flag") {
    return {
      changed: existing.isFlagged === false,
      visibility: existing.visibility,
      isFlagged: true,
    };
  }

  return {
    changed: existing.isFlagged === true,
    visibility: existing.visibility,
    isFlagged: false,
  };
}

export async function moderateCommentsByIds(
  commentIds: string[],
  action: CommentModerationAction,
  moderatedByUserId: string,
): Promise<CommentModerationResult> {
  if (commentIds.length === 0) {
    return {
      action,
      updatedCount: 0,
      unchangedCount: 0,
      missingIds: [],
      comments: [],
    };
  }

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
      visibility: comments.visibility,
      isFlagged: comments.isFlagged,
      moderatedAt: comments.moderatedAt,
      moderatedByUserId: comments.moderatedByUserId,
    })
    .from(comments)
    .leftJoin(profiles, eq(profiles.userId, comments.authorId))
    .where(inArray(comments.id, commentIds));

  const rowMap = new Map(rows.map((row) => [row.id, row]));
  const missingIds = commentIds.filter((commentId) => !rowMap.has(commentId));
  const now = new Date();
  const resultItems: CommentModerationItemResult[] = [];
  let updatedCount = 0;
  let unchangedCount = 0;

  await db.transaction(async (tx) => {
    for (const commentId of commentIds) {
      const row = rowMap.get(commentId);
      if (!row) {
        continue;
      }

      const patch = applyCommentModerationAction(action, row);
      if (!patch.changed) {
        unchangedCount += 1;
        resultItems.push(
          toCommentModerationItemResult({
            ...row,
            changed: false,
          }),
        );
        continue;
      }

      const nextContent = action === "delete" ? "" : row.content;
      await tx
        .update(comments)
        .set({
          content: nextContent,
          visibility: patch.visibility,
          isFlagged: patch.isFlagged,
          moderatedAt: now,
          moderatedByUserId,
          updatedAt: now,
        })
        .where(eq(comments.id, commentId));

      if (action === "delete") {
        await tx.delete(commentLikes).where(eq(commentLikes.commentId, commentId));
      }

      updatedCount += 1;
      resultItems.push(
        toCommentModerationItemResult({
          ...row,
          visibility: patch.visibility,
          isFlagged: patch.isFlagged,
          moderatedAt: now,
          moderatedByUserId,
          changed: true,
        }),
      );
    }
  });

  return {
    action,
    updatedCount,
    unchangedCount,
    missingIds,
    comments: resultItems,
  };
}
