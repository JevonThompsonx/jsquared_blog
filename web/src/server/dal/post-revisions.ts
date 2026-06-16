import "server-only";

import { desc, eq, sql } from "drizzle-orm";

import { postRevisions, posts } from "@/drizzle/schema";
import { getDb } from "@/lib/db";
import { normalizeSongMetadataFields } from "@/lib/post-song-metadata";
import { getPostColumnCapabilities } from "@/server/dal/post-column-capabilities";

export type PostRevisionLayoutType = "standard" | "split-horizontal" | "split-vertical" | "hover";

export type PostRevisionRecord = {
  id: string;
  postId: string;
  revisionNum: number;
  title: string;
  contentJson: string;
  excerpt: string | null;
  layoutType?: PostRevisionLayoutType | null;
  categoryId?: string | null;
  featuredImageId?: string | null;
  locationName?: string | null;
  locationLat?: number | null;
  locationLng?: number | null;
  locationZoom?: number | null;
  songTitle?: string | null;
  songArtist?: string | null;
  songUrl?: string | null;
  savedByUserId: string;
  savedAt: Date;
  label: string | null;
};

type PostRevisionColumns = {
  id: typeof postRevisions.id;
  postId: typeof postRevisions.postId;
  revisionNum: typeof postRevisions.revisionNum;
  title: typeof postRevisions.title;
  contentJson: typeof postRevisions.contentJson;
  excerpt: typeof postRevisions.excerpt;
  layoutType: typeof postRevisions.layoutType;
  categoryId: typeof postRevisions.categoryId;
  featuredImageId: typeof postRevisions.featuredImageId;
  locationName: typeof postRevisions.locationName;
  locationLat: typeof postRevisions.locationLat;
  locationLng: typeof postRevisions.locationLng;
  locationZoom: typeof postRevisions.locationZoom;
  songTitle: typeof postRevisions.songTitle;
  songArtist: typeof postRevisions.songArtist;
  songUrl: typeof postRevisions.songUrl;
  savedByUserId: typeof postRevisions.savedByUserId;
  savedAt: typeof postRevisions.savedAt;
  label: typeof postRevisions.label;
};

const REVISION_COLUMN_SELECTION: PostRevisionColumns = {
  id: postRevisions.id,
  postId: postRevisions.postId,
  revisionNum: postRevisions.revisionNum,
  title: postRevisions.title,
  contentJson: postRevisions.contentJson,
  excerpt: postRevisions.excerpt,
  layoutType: postRevisions.layoutType,
  categoryId: postRevisions.categoryId,
  featuredImageId: postRevisions.featuredImageId,
  locationName: postRevisions.locationName,
  locationLat: postRevisions.locationLat,
  locationLng: postRevisions.locationLng,
  locationZoom: postRevisions.locationZoom,
  songTitle: postRevisions.songTitle,
  songArtist: postRevisions.songArtist,
  songUrl: postRevisions.songUrl,
  savedByUserId: postRevisions.savedByUserId,
  savedAt: postRevisions.savedAt,
  label: postRevisions.label,
};

type RevisionRow = {
  id: string;
  postId: string;
  revisionNum: number;
  title: string;
  contentJson: string;
  excerpt: string | null;
  layoutType: string | null;
  categoryId: string | null;
  featuredImageId: string | null;
  locationName: string | null;
  locationLat: number | null;
  locationLng: number | null;
  locationZoom: number | null;
  songTitle: string | null;
  songArtist: string | null;
  songUrl: string | null;
  savedByUserId: string;
  savedAt: Date;
  label: string | null;
};

function mapRevisionRow(row: RevisionRow): PostRevisionRecord {
  return {
    id: row.id,
    postId: row.postId,
    revisionNum: row.revisionNum,
    title: row.title,
    contentJson: row.contentJson,
    excerpt: row.excerpt,
    layoutType: (row.layoutType as PostRevisionLayoutType | null) ?? null,
    categoryId: row.categoryId,
    featuredImageId: row.featuredImageId,
    locationName: row.locationName,
    locationLat: row.locationLat,
    locationLng: row.locationLng,
    locationZoom: row.locationZoom,
    songTitle: row.songTitle,
    songArtist: row.songArtist,
    songUrl: row.songUrl,
    savedByUserId: row.savedByUserId,
    savedAt: new Date(row.savedAt),
    label: row.label,
  };
}

/**
 * Lists revisions for a post, most recent first.
 * Paginated: returns `limit` rows starting at `offset`.
 * Max 50 rows per call (enforced at call site by the API route).
 */
export async function listPostRevisions(postId: string, limit: number, offset: number): Promise<PostRevisionRecord[]> {
  const db = getDb();

  const rows = await db
    .select(REVISION_COLUMN_SELECTION)
    .from(postRevisions)
    .where(eq(postRevisions.postId, postId))
    .orderBy(desc(postRevisions.revisionNum))
    .limit(limit)
    .offset(offset);

  return rows.map((row) => mapRevisionRow(row as RevisionRow));
}

/**
 * Fetches a single revision by its ID (scoped to a postId for safety).
 */
export async function getPostRevisionById(postId: string, revisionId: string): Promise<PostRevisionRecord | null> {
  const db = getDb();

  const rows = await db
    .select(REVISION_COLUMN_SELECTION)
    .from(postRevisions)
    .where(eq(postRevisions.id, revisionId))
    .limit(1);

  const row = rows[0] as RevisionRow | undefined;
  if (!row || row.postId !== postId) {
    return null;
  }

  return mapRevisionRow(row);
}

/**
 * Creates a revision snapshot for a post.
 *
 * Race-safe: the next revisionNum is computed by a SQL subquery inside the
 * INSERT, not by a read-then-insert pattern. The SELECT and INSERT execute
 * as a single statement, so two concurrent calls cannot produce duplicate
 * revision_num values for the same post.
 *
 * The caller is responsible for passing the current post state before applying updates.
 */
export async function createPostRevision(input: {
  postId: string;
  title: string;
  contentJson: string;
  excerpt: string | null;
  layoutType?: PostRevisionLayoutType | null;
  categoryId?: string | null;
  featuredImageId?: string | null;
  locationName?: string | null;
  locationLat?: number | null;
  locationLng?: number | null;
  locationZoom?: number | null;
  songTitle?: string | null;
  songArtist?: string | null;
  songUrl?: string | null;
  savedByUserId: string;
  label?: string;
}): Promise<PostRevisionRecord> {
  const db = getDb();
  const id = crypto.randomUUID();
  const now = new Date();

  // Single atomic INSERT: the subquery computes MAX+1 atomically with the
  // INSERT, so two concurrent calls cannot interleave the read and write.
  // If no prior revisions exist, COALESCE returns 0 and the new revision is 1.
  const inserted = await db
    .insert(postRevisions)
    .values({
      id,
      postId: input.postId,
      revisionNum: sql<number>`(SELECT COALESCE(MAX(${postRevisions.revisionNum}), 0) + 1 FROM ${postRevisions} WHERE ${postRevisions.postId} = ${input.postId})`,
      title: input.title,
      contentJson: input.contentJson,
      excerpt: input.excerpt,
      layoutType: input.layoutType ?? null,
      categoryId: input.categoryId ?? null,
      featuredImageId: input.featuredImageId ?? null,
      locationName: input.locationName ?? null,
      locationLat: input.locationLat ?? null,
      locationLng: input.locationLng ?? null,
      locationZoom: input.locationZoom ?? null,
      songTitle: input.songTitle ?? null,
      songArtist: input.songArtist ?? null,
      songUrl: input.songUrl ?? null,
      savedByUserId: input.savedByUserId,
      savedAt: now,
      label: input.label ?? null,
    })
    .returning({ revisionNum: postRevisions.revisionNum });

  const nextRevisionNum = inserted[0]?.revisionNum ?? 1;

  return {
    id,
    postId: input.postId,
    revisionNum: nextRevisionNum,
    title: input.title,
    contentJson: input.contentJson,
    excerpt: input.excerpt,
    layoutType: input.layoutType ?? null,
    categoryId: input.categoryId ?? null,
    featuredImageId: input.featuredImageId ?? null,
    locationName: input.locationName ?? null,
    locationLat: input.locationLat ?? null,
    locationLng: input.locationLng ?? null,
    locationZoom: input.locationZoom ?? null,
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
  const caps = await getPostColumnCapabilities();

  return db.transaction(async (tx) => {
    const snapshotRows = await tx
      .select({
        title: posts.title,
        slug: posts.slug,
        contentJson: posts.contentJson,
        excerpt: posts.excerpt,
        layoutType: caps.layoutType ? posts.layoutType : sql<null>`null`,
        categoryId: caps.categoryId ? posts.categoryId : sql<null>`null`,
        featuredImageId: caps.featuredImageId ? posts.featuredImageId : sql<null>`null`,
        locationName: caps.locationName ? posts.locationName : sql<null>`null`,
        locationLat: caps.locationLat ? posts.locationLat : sql<null>`null`,
        locationLng: caps.locationLng ? posts.locationLng : sql<null>`null`,
        locationZoom: caps.locationZoom ? posts.locationZoom : sql<null>`null`,
        songTitle: caps.songTitle ? posts.songTitle : sql<null>`null`,
        songArtist: caps.songArtist ? posts.songArtist : sql<null>`null`,
        songUrl: caps.songUrl ? posts.songUrl : sql<null>`null`,
      })
      .from(posts)
      .where(eq(posts.id, input.postId))
      .limit(1);

    const snapshot = snapshotRows[0];
    if (!snapshot) {
      return null;
    }

    const newRevisionId = crypto.randomUUID();
    const now = new Date();

    // Race-safe: compute the next revisionNum atomically via a SQL subquery
    // inside the INSERT. Two concurrent restore calls (from separate
    // connections that serialize on the row lock) cannot interleave the
    // read and write. The COALESCE handles the empty-revisions case so the
    // first revision is num=1.
    await tx.insert(postRevisions).values({
      id: newRevisionId,
      postId: input.postId,
      revisionNum: sql<number>`(SELECT COALESCE(MAX(${postRevisions.revisionNum}), 0) + 1 FROM ${postRevisions} WHERE ${postRevisions.postId} = ${input.postId})`,
      title: snapshot.title,
      contentJson: snapshot.contentJson,
      excerpt: snapshot.excerpt,
      layoutType: snapshot.layoutType ?? null,
      categoryId: snapshot.categoryId ?? null,
      featuredImageId: snapshot.featuredImageId ?? null,
      locationName: snapshot.locationName ?? null,
      locationLat: snapshot.locationLat ?? null,
      locationLng: snapshot.locationLng ?? null,
      locationZoom: snapshot.locationZoom ?? null,
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
        ...(caps.layoutType ? { layoutType: input.revision.layoutType ?? null } : {}),
        ...(caps.categoryId ? { categoryId: input.revision.categoryId ?? null } : {}),
        ...(caps.featuredImageId ? { featuredImageId: input.revision.featuredImageId ?? null } : {}),
        ...(caps.locationName ? { locationName: input.revision.locationName ?? null } : {}),
        ...(caps.locationLat ? { locationLat: input.revision.locationLat ?? null } : {}),
        ...(caps.locationLng ? { locationLng: input.revision.locationLng ?? null } : {}),
        ...(caps.locationZoom ? { locationZoom: input.revision.locationZoom ?? null } : {}),
        ...(caps.songTitle ? { songTitle: normalizedSongMetadata.songTitle } : {}),
        ...(caps.songArtist ? { songArtist: normalizedSongMetadata.songArtist } : {}),
        ...(caps.songUrl ? { songUrl: normalizedSongMetadata.songUrl } : {}),
        updatedAt: now,
      })
      .where(eq(posts.id, input.postId));

    return {
      newRevisionId,
      slug: snapshot.slug,
    };
  });
}
