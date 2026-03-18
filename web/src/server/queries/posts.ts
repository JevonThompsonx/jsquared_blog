import "server-only";

import { getReadingTimeMinutes, renderTiptapJson } from "@/lib/content";
import { cdnImageUrl } from "@/lib/cloudinary/transform";
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
  type PublishedPostRecord,
} from "@/server/dal/posts";
import type { BlogImage, BlogPost, BlogTag } from "@/types/blog";

function getRenderedPostDescription(post: Pick<PublishedPostRecord, "contentFormat" | "contentHtml" | "contentJson" | "excerpt">): string | null {
  if (post.contentFormat === "tiptap-json") {
    return post.contentHtml ?? renderTiptapJson(post.contentJson) ?? (post.excerpt ? `<p>${post.excerpt}</p>` : null);
  }

  return renderTiptapJson(post.contentJson) ?? post.contentHtml ?? (post.excerpt ? `<p>${post.excerpt}</p>` : null);
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

function getPostReadingTime(post: Pick<PublishedPostRecord, "contentFormat" | "contentHtml" | "contentJson" | "excerpt">): number {
  return getReadingTimeMinutes(getRenderedPostDescription(post));
}

async function withTags(postRows: PublishedPostRecord[]): Promise<BlogPost[]> {
  if (postRows.length === 0) {
    return [];
  }

  const postIds = postRows.map((post) => post.id);
  const [tagRows, commentCounts] = await Promise.all([
    listTagsByPostIds(postIds),
    listCommentCountsByPostIds(postIds),
  ]);

  const tagsByPostId = new Map<string, BlogTag[]>();
  for (const row of tagRows) {
    const existing = tagsByPostId.get(row.postId) ?? [];
    existing.push({ id: row.tagId, name: row.name, slug: row.slug });
    tagsByPostId.set(row.postId, existing);
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
      viewCount: post.viewCount,
      commentCount: commentCounts.get(post.id) ?? 0,
      readingTimeMinutes: getPostReadingTime(post),
  }));
}

function filterPublishedPosts(posts: BlogPost[], search?: string): BlogPost[] {
  const normalizedSearch = search?.trim().toLowerCase();
  if (!normalizedSearch) {
    return posts;
  }

  return posts.filter((post) => {
    const haystack = [post.title, post.category, post.excerpt, post.description, ...post.tags.map((tag) => tag.name)]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return haystack.includes(normalizedSearch);
  });
}

async function getPublishedPostFromTursoBySlug(slug: string): Promise<BlogPost | null> {
  const post = await getPublishedPostRecordBySlug(slug);
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
    source: "turso",
    locationName: post.locationName ?? null,
    locationLat: post.locationLat ?? null,
    locationLng: post.locationLng ?? null,
    locationZoom: post.locationZoom ?? null,
    iovanderUrl: post.iovanderUrl ?? null,
    viewCount: post.viewCount,
    commentCount: 0,
    authorId: post.authorId,
    readingTimeMinutes: getPostReadingTime(post),
  };
}

export async function listAllPublishedPosts(): Promise<BlogPost[]> {
  return withTags(await listAllPublishedPostRecords());
}

export async function listPublishedPosts(limit = 12, offset = 0, search?: string): Promise<BlogPost[]> {
  if (search?.trim()) {
    const allRows = await listAllPublishedPostRecords();
    const allPosts = await withTags(allRows);
    return filterPublishedPosts(allPosts, search).slice(offset, offset + limit);
  }

  return withTags(await listPublishedPostRecords(limit, offset));
}

export async function listPublishedPostsByCategory(category: string, limit = 12, offset = 0): Promise<BlogPost[]> {
  return withTags(await listPublishedPostRecordsByCategory(category, limit, offset));
}

export async function listPublishedPostsByTagSlug(tagSlug: string, limit = 12, offset = 0): Promise<BlogPost[]> {
  return withTags(await listPublishedPostRecordsByTagSlug(tagSlug, limit, offset));
}

export async function getPublishedPostBySlug(slug: string): Promise<BlogPost | null> {
  return getPublishedPostFromTursoBySlug(slug);
}

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
    viewCount: post.viewCount,
    commentCount: 0,
    authorId: post.authorId,
    readingTimeMinutes: getPostReadingTime(post),
  };
}

export async function getRelatedPosts(post: BlogPost, limit = 3): Promise<BlogPost[]> {
  const currentTagSlugs = post.tags.map((tag) => tag.slug);
  const emptyRecordsPromise: Promise<PublishedPostRecord[]> = Promise.resolve([]);
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
    if (record.id !== post.id && record.slug !== post.slug && !candidateRecordMap.has(record.id)) {
      candidateRecordMap.set(record.id, record);
    }
  }

  const candidates = await withTags(Array.from(candidateRecordMap.values()));

  return rankRelatedPosts(post, candidates, limit);
}
