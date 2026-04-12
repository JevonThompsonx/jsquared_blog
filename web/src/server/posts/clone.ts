import "server-only";

import { eq, sql } from "drizzle-orm";

import { mediaAssets, postImages, postTags, posts } from "@/drizzle/schema";
import { getDb } from "@/lib/db";
import { getPostColumnCapabilities } from "@/server/dal/post-column-capabilities";
import { generateUniquePostSlug } from "@/server/posts/slug";

export type ClonedPostResult = {
  postId: string;
  slug: string;
  title: string;
  status: "draft";
};

export async function clonePostById(postId: string): Promise<ClonedPostResult> {
  const caps = await getPostColumnCapabilities();
  const db = getDb();
  const sourceRows = await db
    .select({
      slug: posts.slug,
      title: posts.title,
      contentJson: posts.contentJson,
      contentFormat: posts.contentFormat,
      contentHtml: posts.contentHtml,
      contentPlainText: posts.contentPlainText,
      excerpt: posts.excerpt,
      authorId: posts.authorId,
      categoryId: posts.categoryId,
      seriesId: posts.seriesId,
      seriesOrder: posts.seriesOrder,
      featuredImageId: posts.featuredImageId,
      externalGalleryUrl: posts.externalGalleryUrl,
      externalGalleryLabel: posts.externalGalleryLabel,
      layoutType: caps.layoutType ? posts.layoutType : sql<null>`null`,
      locationName: caps.locationName ? posts.locationName : sql<null>`null`,
      locationLat: caps.locationLat ? posts.locationLat : sql<null>`null`,
      locationLng: caps.locationLng ? posts.locationLng : sql<null>`null`,
      locationZoom: caps.locationZoom ? posts.locationZoom : sql<null>`null`,
      iovanderUrl: caps.iovanderUrl ? posts.iovanderUrl : sql<null>`null`,
      songTitle: caps.songTitle ? posts.songTitle : sql<null>`null`,
      songArtist: caps.songArtist ? posts.songArtist : sql<null>`null`,
      songUrl: caps.songUrl ? posts.songUrl : sql<null>`null`,
    })
    .from(posts)
    .where(eq(posts.id, postId))
    .limit(1);
  const source = sourceRows[0];

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
      publishedAt: null,
      scheduledPublishTime: null,
      authorId: source.authorId,
      categoryId: source.categoryId,
      seriesId: source.seriesId,
      seriesOrder: source.seriesOrder,
      featuredImageId: clonedFeaturedImageId,
      externalGalleryUrl: source.externalGalleryUrl,
      externalGalleryLabel: source.externalGalleryLabel,
      ...(caps.layoutType ? { layoutType: source.layoutType } : {}),
      ...(caps.locationName ? { locationName: source.locationName } : {}),
      ...(caps.locationLat ? { locationLat: source.locationLat } : {}),
      ...(caps.locationLng ? { locationLng: source.locationLng } : {}),
      ...(caps.locationZoom ? { locationZoom: source.locationZoom } : {}),
      ...(caps.iovanderUrl ? { iovanderUrl: source.iovanderUrl } : {}),
      ...(caps.songTitle ? { songTitle: source.songTitle } : {}),
      ...(caps.songArtist ? { songArtist: source.songArtist } : {}),
      ...(caps.songUrl ? { songUrl: source.songUrl } : {}),
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
