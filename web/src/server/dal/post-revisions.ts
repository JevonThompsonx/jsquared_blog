import "server-only";

import { desc, eq, max, sql } from "drizzle-orm";

import { postRevisions, posts } from "@/drizzle/schema";
import { getDb } from "@/lib/db";
import { normalizeSongMetadataFields } from "@/lib/post-song-metadata";

export type PostContentSnapshot = {
  title: string;
  slug: string;
  contentJson: string;
  excerpt: string | null;
  songTitle?: string | null;
  songArtist?: string | null;
  songUrl?: string | null;
};

export type PostRevisionRecord = {
  id: string;
  postId: string;
  revisionNum: number;
  title: string;
  contentJson: string;
  excerpt: string | null;
  songTitle?: string | null;
  songArtist?: string | null;
  songUrl?: string | null;
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
      songTitle: postRevisions.songTitle,
      songArtist: postRevisions.songArtist,
      songUrl: postRevisions.songUrl,
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
      songTitle: row.songTitle,
      songArtist: row.songArtist,
      songUrl: row.songUrl,
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
      songTitle: postRevisions.songTitle,
      songArtist: postRevisions.songArtist,
      songUrl: postRevisions.songUrl,
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
    songTitle: row.songTitle,
    songArtist: row.songArtist,
    songUrl: row.songUrl,
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
  songTitle?: string | null;
  songArtist?: string | null;
  songUrl?: string | null;
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
      songTitle: input.songTitle ?? null,
      songArtist: input.songArtist ?? null,
      songUrl: input.songUrl ?? null,
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
    songTitle: input.songTitle ?? null,
    songArtist: input.songArtist ?? null,
    songUrl: input.songUrl ?? null,
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
      songTitle: posts.songTitle,
      songArtist: posts.songArtist,
      songUrl: posts.songUrl,
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
    songTitle: row.songTitle,
    songArtist: row.songArtist,
    songUrl: row.songUrl,
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
    songTitle?: string | null;
    songArtist?: string | null;
    songUrl?: string | null;
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
      songTitle: content.songTitle ?? null,
      songArtist: content.songArtist ?? null,
      songUrl: content.songUrl ?? null,
      updatedAt: content.updatedAt,
    })
    .where(eq(posts.id, postId));
}

export async function restorePostRevisionAtomically(input: {
  postId: string;
  revision: PostRevisionRecord;
  derivedContent: {
    canonicalContentJson: string;
    contentHtml: string | null;
    contentPlainText: string | null;
    excerpt: string | null;
  };
  savedByUserId: string;
}): Promise<{ newRevisionId: string; slug: string } | null> {
  const db = getDb();
  const normalizedSongMetadata = normalizeSongMetadataFields({
    songTitle: input.revision.songTitle,
    songArtist: input.revision.songArtist,
    songUrl: input.revision.songUrl,
  });

  return db.transaction(async (tx) => {
    const snapshotRows = await tx
      .select({
        title: posts.title,
        slug: posts.slug,
        contentJson: posts.contentJson,
        excerpt: posts.excerpt,
        songTitle: posts.songTitle,
        songArtist: posts.songArtist,
        songUrl: posts.songUrl,
      })
      .from(posts)
      .where(eq(posts.id, input.postId))
      .limit(1);

    const snapshot = snapshotRows[0];
    if (!snapshot) {
      return null;
    }

    const maxResult = await tx
      .select({ maxNum: max(postRevisions.revisionNum) })
      .from(postRevisions)
      .where(eq(postRevisions.postId, input.postId));

    const nextRevisionNum = (maxResult[0]?.maxNum ?? 0) + 1;
    const newRevisionId = crypto.randomUUID();
    const now = new Date();

    await tx.insert(postRevisions).values({
      id: newRevisionId,
      postId: input.postId,
      revisionNum: nextRevisionNum,
      title: snapshot.title,
      contentJson: snapshot.contentJson,
      excerpt: snapshot.excerpt,
      songTitle: snapshot.songTitle ?? null,
      songArtist: snapshot.songArtist ?? null,
      songUrl: snapshot.songUrl ?? null,
      savedByUserId: input.savedByUserId,
      savedAt: now,
      label: `Before restore to revision ${input.revision.revisionNum}`,
    });

    await tx
      .update(posts)
      .set({
        title: input.revision.title,
        contentJson: input.derivedContent.canonicalContentJson,
        contentHtml: input.derivedContent.contentHtml,
        contentPlainText: input.derivedContent.contentPlainText,
        excerpt: input.derivedContent.excerpt,
        songTitle: normalizedSongMetadata.songTitle,
        songArtist: normalizedSongMetadata.songArtist,
        songUrl: normalizedSongMetadata.songUrl,
        updatedAt: now,
      })
      .where(eq(posts.id, input.postId));

    return {
      newRevisionId,
      slug: snapshot.slug,
    };
  });
}
