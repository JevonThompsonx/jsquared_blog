import "server-only";

import { z } from "zod";

import { renderTiptapJson } from "@/lib/content";
import { getPostIdFromSlug, getLegacyApiBaseUrl, slugify } from "@/lib/utils";
import { legacyPostListSchema, legacyPostSchema } from "@/schemas/legacy-posts";
import {
  getPublishedPostRecordBySlug,
  listImagesForPost,
  listPublishedPostRecords,
  listTagsByPostIds,
  listTagsForPost,
} from "@/server/dal/posts";
import type { BlogImage, BlogPost, BlogTag } from "@/types/blog";

type LegacyPostRecord = z.infer<typeof legacyPostSchema>;

async function fetchLegacyJson<T>(path: string, parser: { parse: (input: unknown) => T }): Promise<T> {
  const response = await fetch(`${getLegacyApiBaseUrl()}${path}`, {
    headers: {
      Accept: "application/json",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Legacy API request failed: ${response.status}`);
  }

  const json = await response.json();
  return parser.parse(json);
}

function timestampToIso(value: Date | number | null): string {
  if (value instanceof Date) {
    return value.toISOString();
  }

  return new Date(value ?? Date.now()).toISOString();
}

function mapLegacyPost(post: LegacyPostRecord): BlogPost {
  return {
    id: String(post.id),
    slug: `${post.id}-${slugify(post.title)}`,
    title: post.title,
    description: post.description,
    excerpt: null,
    imageUrl: post.image_url ?? null,
    category: post.category ?? null,
    createdAt: post.created_at,
    status: post.status ?? "published",
    layoutType: post.type ?? "split-vertical",
    tags: (post.tags ?? []).map((tag) => ({
      id: String(tag.id),
      name: tag.name,
      slug: tag.slug,
    })),
    images: (post.images ?? []).map((image, index) => ({
      id: String(image.id ?? `${post.id}-${index}`),
      imageUrl: image.image_url,
      altText: image.alt_text ?? null,
      sortOrder: image.sort_order ?? index,
    })),
    source: "legacy",
  };
}

async function fetchLegacyPublishedPosts(limit: number, offset = 0): Promise<BlogPost[]> {
  const payload = await fetchLegacyJson(`/api/posts?limit=${limit}&offset=${offset}`, legacyPostListSchema);
  return payload.posts
    .filter((post) => !post.status || post.status === "published")
    .map(mapLegacyPost);
}

async function fetchLegacyPublishedPostById(id: number): Promise<BlogPost | null> {
  const post = await fetchLegacyJson(`/api/posts/${id}`, legacyPostSchema);
  if (post.status && post.status !== "published") {
    return null;
  }

  return mapLegacyPost(post);
}

async function listPublishedPostsFromTurso(limit: number, offset = 0): Promise<BlogPost[]> {
  const postRows = await listPublishedPostRecords(limit, offset);

  if (postRows.length === 0) {
    return [];
  }

  const postIds = postRows.map((post) => post.id);
  const tagRows = await listTagsByPostIds(postIds);

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
    imageUrl: post.imageUrl,
    category: post.category ?? null,
    createdAt: timestampToIso(post.publishedAt ?? post.createdAt),
    status: "published",
    layoutType: post.layoutType ?? "standard",
    tags: tagsByPostId.get(post.id) ?? [],
    images: [],
    source: "turso",
  }));
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
    imageUrl: image.imageUrl,
    altText: image.altText ?? null,
    sortOrder: image.sortOrder,
  }));

  return {
    id: post.id,
    slug: post.slug,
    title: post.title,
    description: renderTiptapJson(post.contentJson) ?? (post.excerpt ? `<p>${post.excerpt}</p>` : null),
    excerpt: post.excerpt,
    imageUrl: post.imageUrl,
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
  };
}

export async function listPublishedPosts(limit = 12, offset = 0): Promise<BlogPost[]> {
  try {
    const tursoPosts = await listPublishedPostsFromTurso(limit, offset);
    if (tursoPosts.length > 0) {
      return tursoPosts;
    }
  } catch {
    // Fall through to the legacy API during staged migration.
  }

  try {
    return await fetchLegacyPublishedPosts(limit, offset);
  } catch {
    return [];
  }
}

export async function getPublishedPostBySlug(slug: string): Promise<BlogPost | null> {
  try {
    const tursoPost = await getPublishedPostFromTursoBySlug(slug);
    if (tursoPost) {
      return tursoPost;
    }
  } catch {
    // Fall through to the legacy API during staged migration.
  }

  const legacyId = getPostIdFromSlug(slug);
  if (legacyId === null) {
    return null;
  }

  try {
    return await fetchLegacyPublishedPostById(legacyId);
  } catch {
    return null;
  }
}
