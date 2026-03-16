import "server-only";

import { renderTiptapJson } from "@/lib/content";
import { cdnImageUrl } from "@/lib/cloudinary/transform";
import {
  getPublishedPostRecordBySlug,
  listAllPublishedPostRecords,
  listCommentCountsByPostIds,
  listImagesForPost,
  listPublishedPostRecords,
  listPublishedPostRecordsByCategory,
  listPublishedPostRecordsByTagSlug,
  listTagsByPostIds,
  listTagsForPost,
  type PublishedPostRecord,
} from "@/server/dal/posts";
import type { BlogImage, BlogPost, BlogTag } from "@/types/blog";

function timestampToIso(value: Date | number | null): string {
  if (value instanceof Date) {
    return value.toISOString();
  }

  return new Date(value ?? Date.now()).toISOString();
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
    description: renderTiptapJson(post.contentJson) ?? (post.excerpt ? `<p>${post.excerpt}</p>` : null),
    excerpt: post.excerpt,
    imageUrl: cdnImageUrl(post.imageUrl),
    category: post.category ?? null,
    createdAt: timestampToIso(post.publishedAt ?? post.createdAt),
    status: "published" as const,
    layoutType: post.layoutType ?? "standard",
    tags: tagsByPostId.get(post.id) ?? [],
    images: [],
    source: "turso" as const,
    locationName: post.locationName ?? null,
    locationLat: post.locationLat ?? null,
    locationLng: post.locationLng ?? null,
    locationZoom: post.locationZoom ?? null,
    iovanderUrl: post.iovanderUrl ?? null,
    commentCount: commentCounts.get(post.id) ?? 0,
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
    description: renderTiptapJson(post.contentJson) ?? (post.excerpt ? `<p>${post.excerpt}</p>` : null),
    excerpt: post.excerpt,
    imageUrl: cdnImageUrl(post.imageUrl),
    category: post.category ?? null,
    createdAt: timestampToIso(post.publishedAt ?? post.createdAt),
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
    commentCount: 0,
    authorId: post.authorId,
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

export async function getRelatedPosts(post: BlogPost, limit = 3): Promise<BlogPost[]> {
  const all = await listAllPublishedPosts();
  const currentTagSlugs = new Set(post.tags.map((t) => t.slug));
  const currentDate = new Date(post.createdAt).getTime();

  const scored = all
    .filter((p) => p.slug !== post.slug)
    .map((p) => {
      let score = 0;
      // Same category: strong signal
      if (post.category && p.category === post.category) score += 3;
      // Each shared tag: medium signal
      for (const tag of p.tags) {
        if (currentTagSlugs.has(tag.slug)) score += 2;
      }
      // Published within 90 days of this post: slight recency proximity boost
      const daysDiff = Math.abs(new Date(p.createdAt).getTime() - currentDate) / (1000 * 60 * 60 * 24);
      if (daysDiff <= 90) score += 1;
      return { post: p, score };
    })
    .sort((a, b) => b.score - a.score || new Date(b.post.createdAt).getTime() - new Date(a.post.createdAt).getTime());

  return scored.slice(0, limit).map((s) => s.post);
}
