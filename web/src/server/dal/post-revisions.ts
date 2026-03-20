import "server-only";

import { desc, eq, max, sql } from "drizzle-orm";

import { postRevisions, posts } from "@/drizzle/schema";
import { getDb } from "@/lib/db";

export type PostContentSnapshot = {
  title: string;
  slug: string;
  contentJson: string;
  excerpt: string | null;
};

export type PostRevisionRecord = {
  id: string;
  postId: string;
  revisionNum: number;
  title: string;
  contentJson: string;
  excerpt: string | null;
  savedByUserId: string;
  savedAt: Date;
  label: string | null;
};

/**
 * Lists revisions for a post, most recent first.
 * Paginated: returns `limit` rows starting at `offset`.
 * Max 50 rows per call (enforced at call site by the API route).
 */
export async function listPostRevisions(postId: string, limit: number, offset: number): Promise<PostRevisionRecord[]> {
  const db = getDb();

  const rows = await db
    .select({
      id: postRevisions.id,
      postId: postRevisions.postId,
      revisionNum: postRevisions.revisionNum,
      title: postRevisions.title,
      contentJson: postRevisions.contentJson,
      excerpt: postRevisions.excerpt,
      savedByUserId: postRevisions.savedByUserId,
      savedAt: postRevisions.savedAt,
      label: postRevisions.label,
    })
    .from(postRevisions)
    .where(eq(postRevisions.postId, postId))
    .orderBy(desc(postRevisions.revisionNum))
    .limit(limit)
    .offset(offset);

  return rows.map((row) => ({
    id: row.id,
    postId: row.postId,
    revisionNum: row.revisionNum,
    title: row.title,
    contentJson: row.contentJson,
    excerpt: row.excerpt,
    savedByUserId: row.savedByUserId,
    savedAt: new Date(row.savedAt),
    label: row.label,
  }));
}

/**
 * Fetches a single revision by its ID (scoped to a postId for safety).
 */
export async function getPostRevisionById(postId: string, revisionId: string): Promise<PostRevisionRecord | null> {
  const db = getDb();

  const rows = await db
    .select({
      id: postRevisions.id,
      postId: postRevisions.postId,
      revisionNum: postRevisions.revisionNum,
      title: postRevisions.title,
      contentJson: postRevisions.contentJson,
      excerpt: postRevisions.excerpt,
      savedByUserId: postRevisions.savedByUserId,
      savedAt: postRevisions.savedAt,
      label: postRevisions.label,
    })
    .from(postRevisions)
    .where(eq(postRevisions.id, revisionId))
    .limit(1);

  const row = rows[0];
  if (!row || row.postId !== postId) {
    return null;
  }

  return {
    id: row.id,
    postId: row.postId,
    revisionNum: row.revisionNum,
    title: row.title,
    contentJson: row.contentJson,
    excerpt: row.excerpt,
    savedByUserId: row.savedByUserId,
    savedAt: new Date(row.savedAt),
    label: row.label,
  };
}

/**
 * Creates a revision snapshot for a post.
 * Computes the next revisionNum by reading MAX(revision_num) for the post.
 * The caller is responsible for passing the current post state before applying updates.
 */
export async function createPostRevision(input: {
  postId: string;
  title: string;
  contentJson: string;
  excerpt: string | null;
  savedByUserId: string;
  label?: string;
}): Promise<PostRevisionRecord> {
  const db = getDb();

  // Read current max revision_num for this post (null if no revisions yet → becomes 0+1=1)
  const maxResult = await db
    .select({ maxNum: max(postRevisions.revisionNum) })
    .from(postRevisions)
    .where(eq(postRevisions.postId, input.postId));

  const nextRevisionNum = (maxResult[0]?.maxNum ?? 0) + 1;
  const id = crypto.randomUUID();
  const now = new Date();

  await db.insert(postRevisions).values({
    id,
    postId: input.postId,
    revisionNum: nextRevisionNum,
    title: input.title,
    contentJson: input.contentJson,
    excerpt: input.excerpt,
    savedByUserId: input.savedByUserId,
    savedAt: now,
    label: input.label ?? null,
  });

  return {
    id,
    postId: input.postId,
    revisionNum: nextRevisionNum,
    title: input.title,
    contentJson: input.contentJson,
    excerpt: input.excerpt,
    savedByUserId: input.savedByUserId,
    savedAt: now,
    label: input.label ?? null,
  };
}

/**
 * Counts total revisions for a post (for pagination metadata).
 */
export async function countPostRevisions(postId: string): Promise<number> {
  const db = getDb();

  const result = await db
    .select({ count: sql<number>`count(*)` })
    .from(postRevisions)
    .where(eq(postRevisions.postId, postId));

  return result[0]?.count ?? 0;
}

/**
 * Validates that a post with the given ID exists in the DB.
 * Used by the API route before querying revisions.
 */
export async function postExistsById(postId: string): Promise<boolean> {
  const db = getDb();

  const rows = await db
    .select({ id: posts.id })
    .from(posts)
    .where(eq(posts.id, postId))
    .limit(1);

  return rows.length > 0;
}

/**
 * Fetches a lightweight snapshot of the current post content fields.
 * Used by the restore endpoint to create a pre-restore revision before
 * overwriting the post with an older revision's content.
 */
export async function getPostContentSnapshot(postId: string): Promise<PostContentSnapshot | null> {
  const db = getDb();

  const rows = await db
    .select({
      title: posts.title,
      slug: posts.slug,
      contentJson: posts.contentJson,
      excerpt: posts.excerpt,
    })
    .from(posts)
    .where(eq(posts.id, postId))
    .limit(1);

  const row = rows[0];
  if (!row) {
    return null;
  }

  return {
    title: row.title,
    slug: row.slug,
    contentJson: row.contentJson,
    excerpt: row.excerpt,
  };
}

/**
 * Applies the derived content of a revision back to the posts table.
 * Called by the restore endpoint after creating the pre-restore snapshot revision.
 * The caller is responsible for computing contentHtml and contentPlainText via derivePostContent.
 */
export async function applyRevisionContentToPost(
  postId: string,
  content: {
    title: string;
    contentJson: string;
    contentHtml: string | null;
    contentPlainText: string | null;
    excerpt: string | null;
    updatedAt: Date;
  },
): Promise<void> {
  const db = getDb();

  await db
    .update(posts)
    .set({
      title: content.title,
      contentJson: content.contentJson,
      contentHtml: content.contentHtml,
      contentPlainText: content.contentPlainText,
      excerpt: content.excerpt,
      updatedAt: content.updatedAt,
    })
    .where(eq(posts.id, postId));
}
