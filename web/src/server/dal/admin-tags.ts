import "server-only";

import { asc, count, eq } from "drizzle-orm";

import { postTags, tags } from "@/drizzle/schema";
import { getDb } from "@/lib/db";
import { slugify } from "@/lib/utils";

export type AdminTagRecord = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  postCount: number;
};

export type AdminTagWithTimestamps = AdminTagRecord & {
  createdAt: Date;
  updatedAt: Date;
};

export class TagInUseError extends Error {
  constructor(public readonly tagId: string, public readonly postCount: number) {
    super(`Tag ${tagId} still has ${postCount} post(s) attached`);
    this.name = "TagInUseError";
  }
}

export class TagSlugConflictError extends Error {
  constructor(public readonly slug: string) {
    super(`A tag with slug ${slug} already exists`);
    this.name = "TagSlugConflictError";
  }
}

export type CreateTagInput = {
  name: string;
  slug?: string | null;
  description?: string | null;
};

export type UpdateTagInput = {
  id: string;
  name?: string | null;
  slug?: string | null;
  description?: string | null;
};

export type CreateTagResult = {
  id: string;
  createdAt: Date;
  updatedAt: Date;
};

export type UpdateTagResult = {
  id: string;
  updatedAt: Date;
};

export type DeleteTagResult = {
  id: string;
};

function toDate(value: unknown): Date {
  if (value instanceof Date) return value;
  if (typeof value === "number") return new Date(value);
  if (typeof value === "string") {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  return new Date(0);
}

function normalizeDescription(description: string | null | undefined): string | null {
  if (description === null || description === undefined) return null;
  const trimmed = description.trim();
  return trimmed ? trimmed : null;
}

export async function listAllTagsWithCounts(): Promise<AdminTagRecord[]> {
  const db = getDb();

  const rows = await db
    .select({
      id: tags.id,
      name: tags.name,
      slug: tags.slug,
      description: tags.description,
      postCount: count(postTags.postId),
    })
    .from(tags)
    .leftJoin(postTags, eq(postTags.tagId, tags.id))
    .groupBy(tags.id)
    .orderBy(asc(tags.name));

  return rows.map((r) => ({ ...r, postCount: Number(r.postCount) }));
}

export async function updateTagDescription(tagId: string, description: string | null): Promise<void> {
  const db = getDb();
  await db.update(tags).set({ description: description ?? null }).where(eq(tags.id, tagId));
}

export async function tagSlugExists(slug: string, excludeId?: string): Promise<boolean> {
  const db = getDb();
  const rows = await db
    .select({ id: tags.id })
    .from(tags)
    .where(eq(tags.slug, slug));
  return rows.some((row) => row.id !== excludeId);
}

function buildTagId(slug: string): string {
  return `tag-${slug}`;
}

export async function createTag(input: CreateTagInput): Promise<CreateTagResult> {
  const name = input.name.trim();
  if (!name) {
    throw new Error("Tag name is required");
  }

  const requestedSlug = input.slug?.trim() || slugify(name);
  const slug = requestedSlug || slugify(name);
  if (!slug) {
    throw new Error("Tag slug is required");
  }

  const db = getDb();
  if (await tagSlugExists(slug)) {
    throw new TagSlugConflictError(slug);
  }

  const now = new Date();
  const id = buildTagId(slug);

  await db.insert(tags).values({
    id,
    name,
    slug,
    description: normalizeDescription(input.description),
    createdAt: now,
    updatedAt: now,
  });

  return { id, createdAt: now, updatedAt: now };
}

export async function updateTag(input: UpdateTagInput): Promise<UpdateTagResult> {
  if (!input.id?.trim()) {
    throw new Error("Tag id is required");
  }

  const db = getDb();
  const updatedAt = new Date();
  const update: Partial<{ name: string; slug: string; description: string | null; updatedAt: Date }> = {
    updatedAt,
  };

  if (input.name !== null && input.name !== undefined) {
    const name = input.name.trim();
    if (!name) {
      throw new Error("Tag name is required");
    }
    update.name = name;
  }

  if (input.slug !== null && input.slug !== undefined) {
    const slug = input.slug.trim() || (input.name ? slugify(input.name.trim()) : "");
    if (!slug) {
      throw new Error("Tag slug is required");
    }
    if (await tagSlugExists(slug, input.id)) {
      throw new TagSlugConflictError(slug);
    }
    update.slug = slug;
  }

  if (input.description !== undefined) {
    update.description = normalizeDescription(input.description);
  }

  await db.update(tags).set(update).where(eq(tags.id, input.id));

  return { id: input.id, updatedAt };
}

export async function deleteTag(id: string): Promise<DeleteTagResult> {
  if (!id?.trim()) {
    throw new Error("Tag id is required");
  }

  const db = getDb();
  const usageRows = await db
    .select({ count: count(postTags.postId) })
    .from(postTags)
    .where(eq(postTags.tagId, id));

  const postCount = Number(usageRows[0]?.count ?? 0);
  if (postCount > 0) {
    throw new TagInUseError(id, postCount);
  }

  await db.delete(tags).where(eq(tags.id, id));

  return { id };
}

export type TagDateLike = {
  createdAt?: Date | null;
  updatedAt?: Date | null;
};

export function normalizeTagDates<T extends TagDateLike>(record: T): T & {
  createdAt: Date;
  updatedAt: Date;
} {
  return {
    ...record,
    createdAt: record.createdAt instanceof Date ? record.createdAt : toDate(record.createdAt),
    updatedAt: record.updatedAt instanceof Date ? record.updatedAt : toDate(record.updatedAt),
  };
}
