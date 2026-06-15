import "server-only";

import { asc, count, desc, eq, sql } from "drizzle-orm";

import { categories, postTags, posts, tags } from "@/drizzle/schema";
import { getDb } from "@/lib/db";

export type TagWithCount = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  postCount: number;
  createdAt: Date;
  updatedAt: Date;
};

export type CategoryWithCount = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  postCount: number;
  createdAt: Date;
  updatedAt: Date;
};

function toDate(value: Date | number | null | undefined): Date {
  if (value instanceof Date) {
    return value;
  }

  if (typeof value === "number") {
    return new Date(value);
  }

  return new Date(0);
}

function ascCaseInsensitive(column: Parameters<typeof asc>[0]) {
  return asc(sql<string>`lower(${column})`);
}

export async function listAllTagsForBrowse(): Promise<TagWithCount[]> {
  const db = getDb();
  const rows = await db
    .select({
      id: tags.id,
      name: tags.name,
      slug: tags.slug,
      description: tags.description,
      createdAt: tags.createdAt,
      updatedAt: tags.updatedAt,
      postCount: count(postTags.postId),
    })
    .from(tags)
    .leftJoin(postTags, eq(postTags.tagId, tags.id))
    .groupBy(tags.id)
    .orderBy(desc(count(postTags.postId)), ascCaseInsensitive(tags.name));

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    postCount: Number(row.postCount),
    createdAt: toDate(row.createdAt),
    updatedAt: toDate(row.updatedAt),
  }));
}

export async function listAllCategoriesForBrowse(): Promise<CategoryWithCount[]> {
  const db = getDb();
  const publishedPostCount = sql<number>`COUNT(CASE WHEN ${posts.status} = 'published' THEN ${posts.id} END)`;

  const rows = await db
    .select({
      id: categories.id,
      name: categories.name,
      slug: categories.slug,
      description: categories.description,
      createdAt: categories.createdAt,
      updatedAt: categories.updatedAt,
      postCount: publishedPostCount,
    })
    .from(categories)
    .leftJoin(posts, eq(posts.categoryId, categories.id))
    .groupBy(categories.id)
    .orderBy(desc(publishedPostCount), ascCaseInsensitive(categories.name));

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    postCount: Number(row.postCount ?? 0),
    createdAt: toDate(row.createdAt),
    updatedAt: toDate(row.updatedAt),
  }));
}
