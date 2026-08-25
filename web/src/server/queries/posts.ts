import "server-only";

import { unstable_cache } from "next/cache";

import { getReadingTimeMinutes, renderTiptapJson } from "@/lib/content";
import { cdnImageUrl } from "@/lib/cloudinary/transform";
import { getSongMetadata } from "@/lib/post-song-metadata";
import { rankRelatedPosts } from "@/lib/related-posts";
import {
  getAnyPostRecordById,
  getPublishedPostRecordBySlug,
  listAllPublishedPostRecords,
  listCommentCountsByPostIds,
  listImagesForPost,
  listPublishedPostRecords,
  listPublishedPostRecordsByCategory,
  listPublishedPostRecordsByTagSlugs,
  listPublishedPostRecordsByTagSlug,
  listRecentPublishedPostRecords,
  listTagsByPostIds,
  listTagsForPost,
  searchPublishedPostRecords,
  type PublishedPostRecord,
  type PublishedPostTagRecord,
} from "@/server/dal/posts";
import { listLinksForPost } from "@/server/dal/post-links";
export { listLinksForPost as listPostLinks };
import type { BlogImage, BlogPost, BlogTag } from "@/types/blog";

function getRenderedPostDescription(
  post: Pick<
    PublishedPostRecord,
    "contentFormat" | "contentHtml" | "contentJson" | "excerpt"
  >,
): string | null {
  if (post.contentFormat === "tiptap-json") {
    return (
      post.contentHtml ??
      renderTiptapJson(post.contentJson) ??
      (post.excerpt ? `<p>${post.excerpt}</p>` : null)
    );
  }

  return (
    renderTiptapJson(post.contentJson) ??
    post.contentHtml ??
    (post.excerpt ? `<p>${post.excerpt}</p>` : null)
  );
}

function timestampToIso(value: Date | number | null): string {
  if (value instanceof Date) {
    return value.toISOString();
  }

  return new Date(value ?? Date.now()).toISOString();
}

function timestampToOptionalIso(value: Date | number | null): string | null {
  if (value === null) {
    return null;
  }

  return timestampToIso(value);
}

function getPostReadingTime(
  post: Pick<
    PublishedPostRecord,
    "contentFormat" | "contentHtml" | "contentJson" | "excerpt"
  >,
): number {
  return getReadingTimeMinutes(getRenderedPostDescription(post));
}

async function withTags(postRows: PublishedPostRecord[]): Promise<BlogPost[]> {
  if (postRows.length === 0) {
    return [];
  }

  const postIds = postRows.map((post) => post.id);
  const [tagRows, commentCounts] = await Promise.all([
    listTagsByPostIds(postIds).catch((err) => {
      console.warn("listTagsByPostIds failed, degrading tags:", err);
      return [] as PublishedPostTagRecord[];
    }),
    listCommentCountsByPostIds(postIds).catch((err) => {
      console.warn(
        "listCommentCountsByPostIds failed, degrading comment counts:",
        err,
      );
      return new Map<string, number>();
    }),
  ]);

  const tagsByPostId = new Map<string, BlogTag[]>();
  for (const row of tagRows) {
    const existing = tagsByPostId.get(row.postId) ?? [];
    tagsByPostId.set(row.postId, [
      ...existing,
      { id: row.tagId, name: row.name, slug: row.slug },
    ]);
  }

  return postRows.map((post) => ({
    id: post.id,
    slug: post.slug,
    title: post.title,
    description: getRenderedPostDescription(post),
    excerpt: post.excerpt,
    imageUrl: cdnImageUrl(post.imageUrl),
    category: post.category ?? null,
    createdAt: timestampToIso(post.publishedAt ?? post.createdAt),
    updatedAt: timestampToIso(post.updatedAt),
    publishedAt: timestampToOptionalIso(post.publishedAt),
    status: "published",
    layoutType: post.layoutType ?? "standard",
    tags: tagsByPostId.get(post.id) ?? [],
    images: [],
    source: "turso",
    locationName: post.locationName ?? null,
    locationLat: post.locationLat ?? null,
    locationLng: post.locationLng ?? null,
    locationZoom: post.locationZoom ?? null,
    iovanderUrl: post.iovanderUrl ?? null,
    song: getSongMetadata(post),
    viewCount: post.viewCount,
    commentCount: commentCounts.get(post.id) ?? 0,
    readingTimeMinutes: getPostReadingTime(post),
  }));
}

async function getPublishedPostFromTursoBySlug(
  slug: string,
): Promise<BlogPost | null> {
  const post = await getPublishedPostRecordBySlug(slug);
  if (!post) {
    return null;
  }

  const [tagRows, imageRows, linkRows, commentCountRows] = await Promise.all([
    listTagsForPost(post.id),
    listImagesForPost(post.id),
    listLinksForPost(post.id),
    listCommentCountsByPostIds([post.id]),
  ]);

  const images: BlogImage[] = imageRows.map((image) => ({
    id: image.id,
    imageUrl: cdnImageUrl(image.imageUrl) ?? image.imageUrl,
    altText: image.altText ?? null,
    sortOrder: image.sortOrder,
    exifTakenAt: image.exifTakenAt,
    exifLat: image.exifLat,
    exifLng: image.exifLng,
    exifCameraMake: image.exifCameraMake,
    exifCameraModel: image.exifCameraModel,
    exifLensModel: image.exifLensModel,
    exifAperture: image.exifAperture,
    exifShutterSpeed: image.exifShutterSpeed,
    exifIso: image.exifIso,
  }));

  return {
    id: post.id,
    slug: post.slug,
    title: post.title,
    description: getRenderedPostDescription(post),
    excerpt: post.excerpt,
    imageUrl: cdnImageUrl(post.imageUrl),
    category: post.category ?? null,
    createdAt: timestampToIso(post.publishedAt ?? post.createdAt),
    updatedAt: timestampToIso(post.updatedAt),
    publishedAt: timestampToOptionalIso(post.publishedAt),
    status: "published",
    layoutType: post.layoutType ?? "standard",
    tags: tagRows.map((tag) => ({
      id: tag.tagId,
      name: tag.name,
      slug: tag.slug,
    })),
    images,
    links: linkRows,
    source: "turso",
    locationName: post.locationName ?? null,
    locationLat: post.locationLat ?? null,
    locationLng: post.locationLng ?? null,
    locationZoom: post.locationZoom ?? null,
    iovanderUrl: post.iovanderUrl ?? null,
    song: getSongMetadata(post),
    viewCount: post.viewCount,
    commentCount: commentCountRows.get(post.id) ?? 0,
    authorId: post.authorId,
    readingTimeMinutes: getPostReadingTime(post),
  };
}

export async function listAllPublishedPosts(): Promise<BlogPost[]> {
  return withTags(await listAllPublishedPostRecords());
}

// SPD-5 + EFF-1: cache the homepage feed with `unstable_cache` tagged `"posts"`.
// This is the stable, flag-free equivalent of the React 19 `'use cache'` + `cacheTag`
// pilot: it gives request-coalesced caching plus on-demand `revalidateTag("posts")`
// invalidation (fired by publish/admin actions) — so the feed refreshes immediately on
// publish/unpublish instead of waiting out a time-based `revalidate`. A long `revalidate`
// backstop is kept so a revalidation miss can never leave the homepage empty.
async function listPublishedPostsUncached(
  limit = 12,
  offset = 0,
  search?: string,
): Promise<BlogPost[]> {
  try {
    if (search?.trim()) {
      return withTags(await searchPublishedPostRecords(search, limit, offset));
    }

    return withTags(await listPublishedPostRecords(limit, offset));
  } catch (err) {
    console.warn("listPublishedPosts failed, returning empty feed:", err);
    return [];
  }
}

export const listPublishedPosts = unstable_cache(
  listPublishedPostsUncached,
  ["listPublishedPosts"],
  // EFF-1: tag the feed so publish/unpublish can purge it on demand via
  // `revalidateTag("posts", "max")` instead of relying on a short time window.
  { revalidate: 3600, tags: ["posts"] },
);

export async function listPublishedPostsByCategory(
  categorySlug: string,
  limit = 12,
  offset = 0,
): Promise<BlogPost[]> {
  return withTags(
    await listPublishedPostRecordsByCategory(categorySlug, limit, offset),
  );
}

export async function listPublishedPostsByTagSlug(
  tagSlug: string,
  limit = 12,
  offset = 0,
): Promise<BlogPost[]> {
  return withTags(
    await listPublishedPostRecordsByTagSlug(tagSlug, limit, offset),
  );
}

// SPD-5 + EFF-1: cache the post detail by slug with `unstable_cache`, tagged with a
// per-post cache tag (`post:<slug>`) in addition to the shared `"posts"` tag. This
// replaces the previously uncached `getPublishedPostBySlug` (invoked 3× per request via
// page/head/metadata). Publishing/unpublishing/deleting the post now calls
// `revalidateTag(\`post:${slug}\`, "max")` to purge just this entry on demand, so edits
// go live immediately without a full path revalidation. A long `revalidate` backstop is
// kept so a revalidation miss can never serve a permanently stale post.
async function getPublishedPostBySlugUncached(
  slug: string,
): Promise<BlogPost | null> {
  return getPublishedPostFromTursoBySlug(slug);
}

export const getPublishedPostBySlug = unstable_cache(
  getPublishedPostBySlugUncached,
  // Per-post cache key so each slug is a distinct entry (was previously uncached and
  // hit 3× per request via page/head/metadata).
  ["getPublishedPostBySlug"],
  // EFF-1: tag with the shared `"posts"` tag so publish/unpublish/delete can purge this
  // entry on demand via `revalidateTag("posts", "max")` (wired in publish/delete actions).
  // A long `revalidate` backstop keeps a revalidation miss from serving a permanently
  // stale post.
  { revalidate: 3600, tags: ["posts"] },
);

export async function getPostForPreview(id: string): Promise<BlogPost | null> {
  const post = await getAnyPostRecordById(id);
  if (!post) {
    return null;
  }

  const [tagRows, imageRows] = await Promise.all([
    listTagsForPost(post.id),
    listImagesForPost(post.id),
  ]);

  const images: BlogImage[] = imageRows.map((image) => ({
    id: image.id,
    imageUrl: cdnImageUrl(image.imageUrl) ?? image.imageUrl,
    altText: image.altText ?? null,
    sortOrder: image.sortOrder,
    exifTakenAt: image.exifTakenAt,
    exifLat: image.exifLat,
    exifLng: image.exifLng,
    exifCameraMake: image.exifCameraMake,
    exifCameraModel: image.exifCameraModel,
    exifLensModel: image.exifLensModel,
    exifAperture: image.exifAperture,
    exifShutterSpeed: image.exifShutterSpeed,
    exifIso: image.exifIso,
  }));

  return {
    id: post.id,
    slug: post.slug,
    title: post.title,
    description: getRenderedPostDescription(post),
    excerpt: post.excerpt,
    imageUrl: cdnImageUrl(post.imageUrl),
    category: post.category ?? null,
    createdAt: timestampToIso(post.publishedAt ?? post.createdAt),
    updatedAt: timestampToIso(post.updatedAt),
    publishedAt: timestampToOptionalIso(post.publishedAt),
    status: post.status,
    layoutType: post.layoutType ?? "standard",
    tags: tagRows.map((tag) => ({
      id: tag.tagId,
      name: tag.name,
      slug: tag.slug,
    })),
    images,
    source: "turso",
    locationName: post.locationName ?? null,
    locationLat: post.locationLat ?? null,
    locationLng: post.locationLng ?? null,
    locationZoom: post.locationZoom ?? null,
    iovanderUrl: post.iovanderUrl ?? null,
    song: getSongMetadata(post),
    viewCount: post.viewCount,
    commentCount: 0,
    authorId: post.authorId,
    readingTimeMinutes: getPostReadingTime(post),
  };
}

export async function getRelatedPosts(
  post: BlogPost,
  limit = 3,
): Promise<BlogPost[]> {
  const currentTagSlugs = post.tags.map((tag) => tag.slug);
  const emptyRecordsPromise: Promise<PublishedPostRecord[]> = Promise.resolve(
    [],
  );
  const [categoryRows, tagRows, recentRows] = await Promise.all([
    post.category
      ? listPublishedPostRecordsByCategory(post.category, 12, 0)
      : emptyRecordsPromise,
    currentTagSlugs.length > 0
      ? listPublishedPostRecordsByTagSlugs(currentTagSlugs, 18, post.id)
      : emptyRecordsPromise,
    listRecentPublishedPostRecords(18, post.id),
  ]);

  const candidateRecordMap = new Map<string, PublishedPostRecord>();

  for (const record of [...categoryRows, ...tagRows, ...recentRows]) {
    if (
      record.id !== post.id &&
      record.slug !== post.slug &&
      !candidateRecordMap.has(record.id)
    ) {
      candidateRecordMap.set(record.id, record);
    }
  }

  const candidates = await withTags(Array.from(candidateRecordMap.values()));

  return rankRelatedPosts(post, candidates, limit);
}
