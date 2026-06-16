import "server-only";

import { asc, count, eq } from "drizzle-orm";

import { categories, posts } from "@/drizzle/schema";
import { getDb } from "@/lib/db";
import { slugify } from "@/lib/utils";

export type AdminCategoryRecord = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  postCount: number;
  createdAt: Date;
  updatedAt: Date;
};

export class CategoryInUseError extends Error {
  constructor(public readonly categoryId: string, public readonly postCount: number) {
    super(`Category ${categoryId} still has ${postCount} post(s) attached`);
    this.name = "CategoryInUseError";
  }
}

export class CategorySlugConflictError extends Error {
  constructor(public readonly slug: string) {
    super(`A category with slug ${slug} already exists`);
    this.name = "CategorySlugConflictError";
  }
}

export type CreateCategoryInput = {
  name: string;
  slug?: string | null;
  description?: string | null;
};

export type UpdateCategoryInput = {
  id: string;
  name: string;
  slug?: string | null;
  description?: string | null;
};

function ensureRecord(value: unknown, message: string): asserts value is Record<string, unknown> {
  if (!value || typeof value !== "object") {
    throw new Error(message);
  }
}

function toDate(value: unknown): Date {
  if (value instanceof Date) return value;
  if (typeof value === "number") return new Date(value);
  if (typeof value === "string") {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  return new Date(0);
}

function toOptionalDate(value: unknown): Date | null {
  if (value === null || value === undefined) return null;
  return toDate(value);
}

export async function listAllCategoriesWithCounts(): Promise<AdminCategoryRecord[]> {
  const db = getDb();

  const rows = await db
    .select({
      id: categories.id,
      name: categories.name,
      slug: categories.slug,
      description: categories.description,
      postCount: count(posts.id),
      createdAt: categories.createdAt,
      updatedAt: categories.updatedAt,
    })
    .from(categories)
    .leftJoin(posts, eq(posts.categoryId, categories.id))
    .groupBy(categories.id)
    .orderBy(asc(categories.name));

  return rows.map((row) => {
    ensureRecord(row, "listAllCategoriesWithCounts: row is not a record");
    return {
      id: row.id as string,
      name: row.name as string,
      slug: row.slug as string,
      description: (row.description as string | null | undefined) ?? null,
      postCount: Number(row.postCount ?? 0),
      createdAt: toDate(row.createdAt),
      updatedAt: toDate(row.updatedAt),
    };
  });
}

export async function getCategoryBySlug(slug: string): Promise<AdminCategoryRecord | null> {
  const db = getDb();

  const row = await db
    .select({
      id: categories.id,
      name: categories.name,
      slug: categories.slug,
      description: categories.description,
      postCount: count(posts.id),
      createdAt: categories.createdAt,
      updatedAt: categories.updatedAt,
    })
    .from(categories)
    .leftJoin(posts, eq(posts.categoryId, categories.id))
    .where(eq(categories.slug, slug))
    .groupBy(categories.id);

  const first = row[0];
  if (!first) return null;
  ensureRecord(first, "getCategoryBySlug: row is not a record");
  return {
    id: first.id as string,
    name: first.name as string,
    slug: first.slug as string,
    description: (first.description as string | null | undefined) ?? null,
    postCount: Number(first.postCount ?? 0),
    createdAt: toDate(first.createdAt),
    updatedAt: toDate(first.updatedAt),
  };
}

export async function getCategoryNameBySlug(slug: string): Promise<string | null> {
  const db = getDb();

  const row = await db
    .select({ name: categories.name })
    .from(categories)
    .where(eq(categories.slug, slug))
    .limit(1);

  const first = row[0];
  if (!first) return null;
  ensureRecord(first, "getCategoryNameBySlug: row is not a record");
  return (first.name as string | null | undefined) ?? null;
}

export async function getCategoryById(id: string): Promise<AdminCategoryRecord | null> {
  const db = getDb();

  const row = await db
    .select({
      id: categories.id,
      name: categories.name,
      slug: categories.slug,
      description: categories.description,
      postCount: count(posts.id),
      createdAt: categories.createdAt,
      updatedAt: categories.updatedAt,
    })
    .from(categories)
    .leftJoin(posts, eq(posts.categoryId, categories.id))
    .where(eq(categories.id, id))
    .groupBy(categories.id);

  const first = row[0];
  if (!first) return null;
  ensureRecord(first, "getCategoryById: row is not a record");
  return {
    id: first.id as string,
    name: first.name as string,
    slug: first.slug as string,
    description: (first.description as string | null | undefined) ?? null,
    postCount: Number(first.postCount ?? 0),
    createdAt: toDate(first.createdAt),
    updatedAt: toDate(first.updatedAt),
  };
}

export async function categorySlugExists(slug: string, excludeId?: string): Promise<boolean> {
  const db = getDb();
  const rows = await db
    .select({ id: categories.id })
    .from(categories)
    .where(eq(categories.slug, slug));
  return rows.some((row) => row.id !== excludeId);
}

function buildCategoryId(slug: string): string {
  return `category-${slug}`;
}

function normalizeDescription(description: string | null | undefined): string | null {
  if (description === null || description === undefined) return null;
  const trimmed = description.trim();
  return trimmed ? trimmed : null;
}

export type CreateCategoryResult = {
  id: string;
  createdAt: Date;
  updatedAt: Date;
};

export async function createCategory(input: CreateCategoryInput): Promise<CreateCategoryResult> {
  const name = input.name.trim();
  if (!name) {
    throw new Error("Category name is required");
  }

  const requestedSlug = input.slug?.trim() || slugify(name);
  const slug = requestedSlug || slugify(name);
  if (!slug) {
    throw new Error("Category slug is required");
  }

  const db = getDb();
  if (await categorySlugExists(slug)) {
    throw new CategorySlugConflictError(slug);
  }

  const now = new Date();
  const id = buildCategoryId(slug);

  await db.insert(categories).values({
    id,
    name,
    slug,
    description: normalizeDescription(input.description),
    createdAt: now,
    updatedAt: now,
  });

  return { id, createdAt: now, updatedAt: now };
}

export type UpdateCategoryResult = {
  id: string;
  updatedAt: Date;
};

export async function updateCategory(input: UpdateCategoryInput): Promise<UpdateCategoryResult> {
  if (!input.id?.trim()) {
    throw new Error("Category id is required");
  }

  const name = input.name.trim();
  if (!name) {
    throw new Error("Category name is required");
  }

  const requestedSlug = input.slug?.trim() || slugify(name);
  const slug = requestedSlug || slugify(name);
  if (!slug) {
    throw new Error("Category slug is required");
  }

  if (await categorySlugExists(slug, input.id)) {
    throw new CategorySlugConflictError(slug);
  }

  const db = getDb();
  const now = new Date();
  await db
    .update(categories)
    .set({
      name,
      slug,
      description: normalizeDescription(input.description),
      updatedAt: now,
    })
    .where(eq(categories.id, input.id));

  return { id: input.id, updatedAt: now };
}

export type DeleteCategoryResult = {
  id: string;
};

export async function deleteCategory(id: string): Promise<DeleteCategoryResult> {
  if (!id?.trim()) {
    throw new Error("Category id is required");
  }

  const db = getDb();
  const postRows = await db
    .select({ count: count(posts.id) })
    .from(posts)
    .where(eq(posts.categoryId, id));

  const postCount = Number(postRows[0]?.count ?? 0);
  if (postCount > 0) {
    throw new CategoryInUseError(id, postCount);
  }

  await db.delete(categories).where(eq(categories.id, id));

  return { id };
}

export type CategoryDateLike = {
  createdAt?: Date | null;
  updatedAt?: Date | null;
};

export function normalizeCategoryDates<T extends CategoryDateLike>(record: T): T & {
  createdAt: Date;
  updatedAt: Date;
} {
  return {
    ...record,
    createdAt: toOptionalDate(record.createdAt) ?? new Date(0),
    updatedAt: toOptionalDate(record.updatedAt) ?? new Date(0),
  };
}
