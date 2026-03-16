import "server-only";

import { asc, count, eq } from "drizzle-orm";

import { postTags, tags } from "@/drizzle/schema";
import { getDb } from "@/lib/db";

export type AdminTagRecord = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  postCount: number;
};

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
