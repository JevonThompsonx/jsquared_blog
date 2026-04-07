import "server-only";

import { eq } from "drizzle-orm";

import { mediaAssets, postImages, postTags, posts } from "@/drizzle/schema";
import { getDb } from "@/lib/db";
import { generateUniquePostSlug } from "@/server/posts/slug";

export type ClonedPostResult = {
  postId: string;
  slug: string;
  title: string;
  status: "draft";
};

export async function clonePostById(postId: string): Promise<ClonedPostResult> {
  const db = getDb();
  const source = await db.query.posts.findFirst({
    where: eq(posts.id, postId),
  });

  if (!source) {
    throw new Error(`Post ${postId} not found`);
  }

  const [sourceTags, sourceGalleryRows, nextSlug] = await Promise.all([
    db.select({ tagId: postTags.tagId }).from(postTags).where(eq(postTags.postId, postId)),
    db.select().from(postImages).where(eq(postImages.postId, postId)).orderBy(postImages.sortOrder),
    generateUniquePostSlug(`${source.slug}-copy`),
  ]);

  const now = new Date();
  const nextTitle = `Copy of ${source.title}`;
  const clonedPostId = crypto.randomUUID();

  await db.transaction(async (tx) => {
    async function cloneMediaAssetInTransaction(mediaAssetId: string, ownerUserId: string): Promise<string> {
      const sourceAsset = await tx.query.mediaAssets.findFirst({
        where: eq(mediaAssets.id, mediaAssetId),
      });

      if (!sourceAsset) {
        throw new Error(`Media asset ${mediaAssetId} not found`);
      }

      const clonedAssetId = crypto.randomUUID();
      await tx.insert(mediaAssets).values({
        id: clonedAssetId,
        ownerUserId,
        provider: sourceAsset.provider,
        publicId: sourceAsset.publicId,
        secureUrl: sourceAsset.secureUrl,
        resourceType: sourceAsset.resourceType,
        format: sourceAsset.format,
        width: sourceAsset.width,
        height: sourceAsset.height,
        bytes: sourceAsset.bytes,
        altText: sourceAsset.altText,
        createdAt: now,
      });

      return clonedAssetId;
    }

    const clonedFeaturedImageId = source.featuredImageId
      ? await cloneMediaAssetInTransaction(source.featuredImageId, source.authorId)
      : null;

    await tx.insert(posts).values({
      id: clonedPostId,
      title: nextTitle,
      slug: nextSlug,
      contentJson: source.contentJson,
      contentFormat: source.contentFormat,
      contentHtml: source.contentHtml,
      contentPlainText: source.contentPlainText,
      excerpt: source.excerpt,
      status: "draft",
      layoutType: source.layoutType,
      publishedAt: null,
      scheduledPublishTime: null,
      authorId: source.authorId,
      categoryId: source.categoryId,
      seriesId: source.seriesId,
      seriesOrder: source.seriesOrder,
      featuredImageId: clonedFeaturedImageId,
      externalGalleryUrl: source.externalGalleryUrl,
      externalGalleryLabel: source.externalGalleryLabel,
      locationName: source.locationName,
        locationLat: source.locationLat,
        locationLng: source.locationLng,
        locationZoom: source.locationZoom,
        iovanderUrl: source.iovanderUrl,
        songTitle: source.songTitle,
        songArtist: source.songArtist,
        songUrl: source.songUrl,
        createdAt: now,
        updatedAt: now,
      });

    for (const sourceTag of sourceTags) {
      await tx.insert(postTags).values({ postId: clonedPostId, tagId: sourceTag.tagId }).onConflictDoNothing();
    }

    for (const sourceGalleryRow of sourceGalleryRows) {
      const clonedMediaAssetId = await cloneMediaAssetInTransaction(sourceGalleryRow.mediaAssetId, source.authorId);
      await tx.insert(postImages).values({
        id: crypto.randomUUID(),
        postId: clonedPostId,
        mediaAssetId: clonedMediaAssetId,
        sortOrder: sourceGalleryRow.sortOrder,
        focalX: sourceGalleryRow.focalX,
        focalY: sourceGalleryRow.focalY,
        caption: sourceGalleryRow.caption,
        createdAt: now,
      });
    }
  });

  return {
    postId: clonedPostId,
    slug: nextSlug,
    title: nextTitle,
    status: "draft",
  };
}
