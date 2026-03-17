import "server-only";

import { and, eq, inArray, lte } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { posts } from "@/drizzle/schema";
import { getDb } from "@/lib/db";

type PublishOperation = "publish" | "unpublish";
type PublishableStatus = "draft" | "published" | "scheduled";

export type PostPublishTarget = {
  id: string;
  slug: string;
  status: PublishableStatus;
  publishedAt: Date | null;
  scheduledPublishTime: Date | null;
};

export type PostPublishResult = {
  operation: PublishOperation;
  requestedCount: number;
  updated: number;
  updatedCount: number;
  unchangedCount: number;
  missingIds: string[];
  updatedPostIds: string[];
  unchangedPostIds: string[];
};

function revalidatePosts(slugs: string[]): void {
  for (const slug of slugs) {
    revalidatePath(`/posts/${slug}`);
  }

  revalidatePath("/");
  revalidatePath("/admin");
}

function dedupeSlugs(slugs: string[]): string[] {
  return [...new Set(slugs)];
}

function dedupeIds(postIds: string[]): string[] {
  return [...new Set(postIds)];
}

export async function getPublishTargetsByIds(postIds: string[]): Promise<PostPublishTarget[]> {
  const ids = dedupeIds(postIds);
  if (ids.length === 0) {
    return [];
  }

  const db = getDb();
  return db
    .select({
      id: posts.id,
      slug: posts.slug,
      status: posts.status,
      publishedAt: posts.publishedAt,
      scheduledPublishTime: posts.scheduledPublishTime,
    })
    .from(posts)
    .where(inArray(posts.id, ids));
}

export async function publishPosts(postIds: string[], now = new Date()): Promise<PostPublishResult> {
  const ids = dedupeIds(postIds);
  const targets = await getPublishTargetsByIds(ids);
  const targetIds = new Set(targets.map((target) => target.id));
  const missingIds = ids.filter((id) => !targetIds.has(id));
  const postsToUpdate = targets.filter((target) => target.status !== "published");
  const unchanged = targets.filter((target) => target.status === "published");

  if (postsToUpdate.length > 0) {
    const db = getDb();
    await db
      .update(posts)
      .set({
        status: "published",
        publishedAt: now,
        scheduledPublishTime: null,
        updatedAt: now,
      })
      .where(inArray(posts.id, postsToUpdate.map((post) => post.id)));
  }

  revalidatePosts(dedupeSlugs(targets.map((target) => target.slug)));

  return {
    operation: "publish",
    requestedCount: ids.length,
    updated: postsToUpdate.length,
    updatedCount: postsToUpdate.length,
    unchangedCount: unchanged.length,
    missingIds,
    updatedPostIds: postsToUpdate.map((post) => post.id),
    unchangedPostIds: unchanged.map((post) => post.id),
  };
}

export async function unpublishPosts(postIds: string[], now = new Date()): Promise<PostPublishResult> {
  const ids = dedupeIds(postIds);
  const targets = await getPublishTargetsByIds(ids);
  const targetIds = new Set(targets.map((target) => target.id));
  const missingIds = ids.filter((id) => !targetIds.has(id));
  const postsToUpdate = targets.filter((target) => target.status !== "draft");
  const unchanged = targets.filter((target) => target.status === "draft");

  if (postsToUpdate.length > 0) {
    const db = getDb();
    await db
      .update(posts)
      .set({
        status: "draft",
        publishedAt: null,
        scheduledPublishTime: null,
        updatedAt: now,
      })
      .where(inArray(posts.id, postsToUpdate.map((post) => post.id)));
  }

  revalidatePosts(dedupeSlugs(targets.map((target) => target.slug)));

  return {
    operation: "unpublish",
    requestedCount: ids.length,
    updated: postsToUpdate.length,
    updatedCount: postsToUpdate.length,
    unchangedCount: unchanged.length,
    missingIds,
    updatedPostIds: postsToUpdate.map((post) => post.id),
    unchangedPostIds: unchanged.map((post) => post.id),
  };
}

export type ScheduledPublishRun = {
  scannedCount: number;
  publishedCount: number;
  updatedPostIds: string[];
  nowIso: string;
};

export async function publishDueScheduledPosts(now = new Date()): Promise<ScheduledPublishRun> {
  const db = getDb();
  const duePosts = await db
    .select({
      id: posts.id,
      slug: posts.slug,
      scheduledPublishTime: posts.scheduledPublishTime,
    })
    .from(posts)
    .where(and(eq(posts.status, "scheduled"), lte(posts.scheduledPublishTime, now)));

  const dueIds = duePosts.map((post) => post.id);

  if (dueIds.length > 0) {
    for (const post of duePosts) {
      await db
        .update(posts)
        .set({
          status: "published",
          publishedAt: post.scheduledPublishTime ?? now,
          scheduledPublishTime: null,
          updatedAt: now,
        })
        .where(and(eq(posts.id, post.id), eq(posts.status, "scheduled")));
    }
  }

  revalidatePosts(dedupeSlugs(duePosts.map((post) => post.slug)));

  return {
    scannedCount: duePosts.length,
    publishedCount: dueIds.length,
    updatedPostIds: dueIds,
    nowIso: now.toISOString(),
  };
}
