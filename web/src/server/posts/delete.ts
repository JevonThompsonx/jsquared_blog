import "server-only";

import { eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import {
  commentLikes,
  comments,
  postBookmarks,
  postImages,
  postPreviewTokens,
  postRevisions,
  postTags,
  posts,
  mediaAssets,
} from "@/drizzle/schema";
import { getDb } from "@/lib/db";

export type PostDeleteResult = {
  requestedCount: number;
  deletedCount: number;
  missingIds: string[];
  deletedPostIds: string[];
};

function dedupeIds(postIds: string[]): string[] {
  return [...new Set(postIds)];
}

export async function deletePosts(postIds: string[]): Promise<PostDeleteResult> {
  const ids = dedupeIds(postIds);
  if (ids.length === 0) {
    return { requestedCount: 0, deletedCount: 0, missingIds: [], deletedPostIds: [] };
  }

  const db = getDb();

  // Fetch existing posts to determine which IDs are valid
  const existing = await db
    .select({ id: posts.id, slug: posts.slug, featuredImageId: posts.featuredImageId })
    .from(posts)
    .where(inArray(posts.id, ids));

  const existingIds = new Set(existing.map((p) => p.id));
  const missingIds = ids.filter((id) => !existingIds.has(id));
  const toDelete = existing.map((p) => p.id);

  if (toDelete.length === 0) {
    return { requestedCount: ids.length, deletedCount: 0, missingIds, deletedPostIds: [] };
  }

  await db.transaction(async (tx) => {
    // 1. Delete comment likes for comments on these posts
    const postComments = await tx
      .select({ id: comments.id })
      .from(comments)
      .where(inArray(comments.postId, toDelete));

    const commentIds = postComments.map((c) => c.id);
    if (commentIds.length > 0) {
      await tx.delete(commentLikes).where(inArray(commentLikes.commentId, commentIds));
    }

    // 2. Delete comments
    await tx.delete(comments).where(inArray(comments.postId, toDelete));

    // 3. Delete post bookmarks
    await tx.delete(postBookmarks).where(inArray(postBookmarks.postId, toDelete));

    // 4. Delete post tags
    await tx.delete(postTags).where(inArray(postTags.postId, toDelete));

    // 5. Delete post preview tokens
    await tx.delete(postPreviewTokens).where(inArray(postPreviewTokens.postId, toDelete));

    // 6. Delete post revisions
    await tx.delete(postRevisions).where(inArray(postRevisions.postId, toDelete));

    // 7. Delete gallery images and their media assets
    const galleryRows = await tx
      .select({ mediaAssetId: postImages.mediaAssetId })
      .from(postImages)
      .where(inArray(postImages.postId, toDelete));

    await tx.delete(postImages).where(inArray(postImages.postId, toDelete));

    const galleryAssetIds = galleryRows.map((r) => r.mediaAssetId);
    if (galleryAssetIds.length > 0) {
      await tx.delete(mediaAssets).where(inArray(mediaAssets.id, galleryAssetIds));
    }

    // 8. Clear featured image FK, then delete featured media assets
    const featuredImageIds = existing
      .map((p) => p.featuredImageId)
      .filter((id): id is string => id !== null);

    if (featuredImageIds.length > 0) {
      for (const postId of toDelete) {
        await tx.update(posts).set({ featuredImageId: null }).where(eq(posts.id, postId));
      }
      await tx.delete(mediaAssets).where(inArray(mediaAssets.id, featuredImageIds));
    }

    // 9. Delete the posts themselves
    await tx.delete(posts).where(inArray(posts.id, toDelete));
  });

  // Revalidate affected routes
  for (const post of existing) {
    revalidatePath(`/posts/${post.slug}`);
  }
  revalidatePath("/");
  revalidatePath("/admin");

  return {
    requestedCount: ids.length,
    deletedCount: toDelete.length,
    missingIds,
    deletedPostIds: toDelete,
  };
}
