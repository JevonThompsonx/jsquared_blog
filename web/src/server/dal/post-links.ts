import "server-only";

import { asc, eq } from "drizzle-orm";

import { postLinks } from "@/drizzle/schema";
import { getDb } from "@/lib/db";

export type PostLink = {
  id: string;
  postId: string;
  label: string;
  url: string;
  sortOrder: number;
  createdAt: Date;
};

export async function listLinksForPost(postId: string): Promise<PostLink[]> {
  try {
    const db = getDb();
    const rows = await db
      .select()
      .from(postLinks)
      .where(eq(postLinks.postId, postId))
      .orderBy(asc(postLinks.sortOrder));

    return rows.map((row) => ({
      id: row.id,
      postId: row.postId,
      label: row.label,
      url: row.url,
      sortOrder: row.sortOrder,
      createdAt: row.createdAt instanceof Date ? row.createdAt : new Date(row.createdAt),
    }));
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    const causeMsg = error instanceof Error && error.cause instanceof Error ? error.cause.message : "";
    if (msg.includes("no such table") || msg.includes("SQLITE_ERROR") || causeMsg.includes("no such table")) {
      return [];
    }
    throw error;
  }
}

export async function replaceLinksForPost(
  postId: string,
  links: Array<{ label: string; url: string; sortOrder: number }>,
): Promise<void> {
  const db = getDb();
  try {
    await db.transaction(async (tx) => {
      await tx.delete(postLinks).where(eq(postLinks.postId, postId));

      if (links.length === 0) {
        return;
      }

      const now = new Date();
      await tx.insert(postLinks).values(
        links.map((link, i) => ({
          id: crypto.randomUUID(),
          postId,
          label: link.label,
          url: link.url,
          sortOrder: typeof link.sortOrder === "number" ? link.sortOrder : i,
          createdAt: now,
        })),
      );
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (msg.includes("no such table") || msg.includes("SQLITE_ERROR")) {
      // Table not yet migrated — silently skip so existing save flow is unaffected.
      return;
    }
    throw error;
  }
}
