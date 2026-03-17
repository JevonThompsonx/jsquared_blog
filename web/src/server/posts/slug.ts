import "server-only";

import { and, eq, ne } from "drizzle-orm";

import { posts } from "@/drizzle/schema";
import { getDb } from "@/lib/db";
import { slugify } from "@/lib/utils";

export async function generateUniquePostSlug(baseValue: string, excludePostId?: string): Promise<string> {
  const db = getDb();
  const normalizedBase = slugify(baseValue) || "untitled-post";

  for (let attempt = 0; attempt < 200; attempt += 1) {
    const candidate = attempt === 0 ? normalizedBase : `${normalizedBase}-${attempt + 1}`;
    const existing = await db.query.posts.findFirst({
      where: excludePostId
        ? and(eq(posts.slug, candidate), ne(posts.id, excludePostId))
        : eq(posts.slug, candidate),
      columns: { id: true },
    });

    if (!existing) {
      return candidate;
    }
  }

  throw new Error(`Could not generate a unique slug for ${normalizedBase}`);
}
