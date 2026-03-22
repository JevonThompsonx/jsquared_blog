"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { categories, mediaAssets, postImages, postTags, posts, tags } from "@/drizzle/schema";
import { requireAdminSession } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { createPostRevision } from "@/server/dal/post-revisions";
import { ensureSeriesId } from "@/server/dal/series";
import { adminPostFormSchema } from "@/server/forms/admin-post-form";
import { derivePostContent } from "@/server/posts/content";
import { clonePostById } from "@/server/posts/clone";
import { createPostPreviewAccess, revokePostPreviewTokens } from "@/server/posts/preview";
import { deletePosts, type PostDeleteResult } from "@/server/posts/delete";
import { publishPosts, unpublishPosts, type PostPublishResult } from "@/server/posts/publish";
import { generateUniquePostSlug } from "@/server/posts/slug";
import { slugify } from "@/lib/utils";

type DbExecutor = Pick<ReturnType<typeof getDb>, "query" | "select" | "insert" | "update" | "delete">;

function normalizeScheduledTimestamp(
  value: string,
  offsetMinutesValue: string,
  status: "draft" | "published" | "scheduled",
) {
  if (status !== "scheduled") {
    return null;
  }

  const trimmedValue = value.trim();
  if (!trimmedValue) {
    return null;
  }

  const parsedOffset = Number.parseInt(offsetMinutesValue, 10);
  const offsetMinutes = Number.isFinite(parsedOffset) ? parsedOffset : 0;
  const normalizedValue = trimmedValue.includes("T") ? `${trimmedValue}:00` : trimmedValue;
  const localTimestamp = Date.parse(normalizedValue);
  if (Number.isNaN(localTimestamp)) {
    return new Date(Number.NaN);
  }

  return new Date(localTimestamp + offsetMinutes * 60 * 1000);
}

async function ensureAdmin() {
  const session = await requireAdminSession();
  if (!session?.user?.id) {
    redirect("/admin?error=AccessDenied");
  }

  return session.user.id;
}

async function ensureCategoryIdTx(tx: DbExecutor, categoryName: string | undefined) {
  const trimmedName = categoryName?.trim();
  if (!trimmedName) {
    return null;
  }

  const categorySlug = slugify(trimmedName);
  const existingCategory = await tx.query.categories.findFirst({
    where: eq(categories.slug, categorySlug),
    columns: { id: true },
  });

  if (existingCategory) {
    return existingCategory.id;
  }

  const categoryId = `category-${categorySlug}`;

  await tx
    .insert(categories)
    .values({
      id: categoryId,
      name: trimmedName,
      slug: categorySlug,
      description: null,
    })
    .onConflictDoUpdate({
      target: categories.id,
      set: {
        name: trimmedName,
        slug: categorySlug,
      },
    });

  return categoryId;
}

function parseFormData(formData: FormData) {
  return adminPostFormSchema.parse({
    title: formData.get("title"),
    slug: formData.get("slug"),
    excerpt: formData.get("excerpt"),
    categoryName: formData.get("categoryName"),
    tagNames: formData.get("tagNames"),
    status: formData.get("status"),
    layoutType: formData.get("layoutType"),
    scheduledPublishTime: formData.get("scheduledPublishTime"),
    scheduledPublishOffsetMinutes: formData.get("scheduledPublishOffsetMinutes"),
    featuredImageUrl: formData.get("featuredImageUrl"),
    featuredImageAlt: formData.get("featuredImageAlt"),
    galleryEntries: formData.get("galleryEntries"),
    contentJson: formData.get("contentJson"),
    seriesTitle: formData.get("seriesTitle"),
    seriesOrder: formData.get("seriesOrder"),
    locationName: formData.get("locationName"),
    iovanderUrl: formData.get("iovanderUrl"),
  });
}

type GeoResult = {
  lat: number;
  lng: number;
  zoom: number;
};

async function geocodeLocation(locationName: string): Promise<GeoResult | null> {
  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(locationName)}&format=json&limit=1`;
    const res = await fetch(url, {
      headers: { "User-Agent": "jsquaredadventures.com (travel blog)" },
    });

    if (!res.ok) {
      return null;
    }

    const data = z.array(z.object({ lat: z.string(), lon: z.string(), type: z.string() })).parse(await res.json());
    const first = data[0];
    if (!first) {
      return null;
    }

    const lat = Number.parseFloat(first.lat);
    const lng = Number.parseFloat(first.lon);

    const countryTypes = new Set(["country", "continent"]);
    const regionTypes = new Set(["state", "region", "province", "county"]);
    const cityTypes = new Set(["city", "town", "village", "municipality"]);
    let zoom = 10;
    if (countryTypes.has(first.type)) zoom = 5;
    else if (regionTypes.has(first.type)) zoom = 7;
    else if (cityTypes.has(first.type)) zoom = 10;
    else zoom = 13;

    return { lat, lng, zoom };
  } catch {
    return null;
  }
}

function parseTagNames(value: string) {
  return [...new Set(value.split(",").map((tag) => tag.trim()).filter(Boolean))];
}

function parseUnknownJson(value: string): unknown {
  return JSON.parse(value);
}

const galleryEntrySchema = z.object({
  imageUrl: z.string().trim().optional(),
  altText: z.string().trim().nullable().optional(),
  sortOrder: z.number().optional(),
  focalX: z.number().nullable().optional(),
  focalY: z.number().nullable().optional(),
  // EXIF fields — set by the upload route and passed back from the frontend
  exifTakenAt: z.number().nullable().optional(), // epoch ms
  exifLat: z.number().nullable().optional(),
  exifLng: z.number().nullable().optional(),
  exifCameraMake: z.string().nullable().optional(),
  exifCameraModel: z.string().nullable().optional(),
  exifLensModel: z.string().nullable().optional(),
  exifAperture: z.number().nullable().optional(),
  exifShutterSpeed: z.string().nullable().optional(),
  exifIso: z.number().nullable().optional(),
});

function parseGalleryEntries(value: string) {
  try {
    const parsed = z.array(galleryEntrySchema).parse(parseUnknownJson(value));

    return parsed
      .filter((entry) => Boolean(entry.imageUrl?.trim()))
      .map((entry, index) => ({
        imageUrl: entry.imageUrl ?? "",
        altText: entry.altText?.trim() || null,
        sortOrder: typeof entry.sortOrder === "number" ? entry.sortOrder : index,
        focalX: typeof entry.focalX === "number" ? entry.focalX : null,
        focalY: typeof entry.focalY === "number" ? entry.focalY : null,
        exifTakenAt: typeof entry.exifTakenAt === "number" ? new Date(entry.exifTakenAt) : null,
        exifLat: typeof entry.exifLat === "number" ? entry.exifLat : null,
        exifLng: typeof entry.exifLng === "number" ? entry.exifLng : null,
        exifCameraMake: entry.exifCameraMake?.trim() || null,
        exifCameraModel: entry.exifCameraModel?.trim() || null,
        exifLensModel: entry.exifLensModel?.trim() || null,
        exifAperture: typeof entry.exifAperture === "number" ? entry.exifAperture : null,
        exifShutterSpeed: entry.exifShutterSpeed?.trim() || null,
        exifIso: typeof entry.exifIso === "number" ? Math.round(entry.exifIso) : null,
      }));
  } catch {
    return [];
  }
}

function getMediaProvider(imageUrl: string): "cloudinary" | "supabase" {
  return imageUrl.includes("cloudinary.com") ? "cloudinary" : "supabase";
}

function getMediaPublicId(imageUrl: string) {
  try {
    const parsed = new URL(imageUrl);
    return `${parsed.hostname}${parsed.pathname}`;
  } catch {
    return imageUrl;
  }
}

function getMediaFormat(imageUrl: string) {
  try {
    const parsed = new URL(imageUrl);
    const fileName = parsed.pathname.split("/").filter(Boolean).pop() ?? "";
    return fileName.includes(".") ? fileName.split(".").pop() ?? null : null;
  } catch {
    return null;
  }
}

async function syncTagsForPostTx(tx: DbExecutor, postId: string, tagNames: string[]) {
  await tx.delete(postTags).where(eq(postTags.postId, postId));

  for (const tagName of tagNames) {
    const slug = slugify(tagName);

    const existing = await tx.query.tags.findFirst({
      where: eq(tags.slug, slug),
      columns: { id: true },
    });

    const tagId = existing?.id ?? `tag-${slug}`;

    if (!existing) {
      await tx
        .insert(tags)
        .values({ id: tagId, name: tagName, slug })
        .onConflictDoNothing();
    }

    await tx.insert(postTags).values({ postId, tagId }).onConflictDoNothing();
  }
}

async function replacePostMediaTx(tx: DbExecutor, options: {
  postId: string;
  authorId: string;
  featuredImageUrl: string;
  featuredImageAlt: string;
  galleryEntries: Array<{
    imageUrl: string;
    altText: string | null;
    sortOrder: number;
    focalX: number | null;
    focalY: number | null;
    exifTakenAt: Date | null;
    exifLat: number | null;
    exifLng: number | null;
    exifCameraMake: string | null;
    exifCameraModel: string | null;
    exifLensModel: string | null;
    exifAperture: number | null;
    exifShutterSpeed: string | null;
    exifIso: number | null;
  }>;
}) {
  const existingPost = await tx.query.posts.findFirst({
    where: eq(posts.id, options.postId),
    columns: { featuredImageId: true },
  });

  const existingGalleryRows = await tx
    .select({ mediaAssetId: postImages.mediaAssetId })
    .from(postImages)
    .where(eq(postImages.postId, options.postId));

  await tx.delete(postImages).where(eq(postImages.postId, options.postId));

  for (const row of existingGalleryRows) {
    await tx.delete(mediaAssets).where(eq(mediaAssets.id, row.mediaAssetId));
  }

  let featuredImageId: string | null = existingPost?.featuredImageId ?? null;
  if (featuredImageId) {
    const oldFeaturedImageId = featuredImageId;
    featuredImageId = null;
    await tx.update(posts).set({ featuredImageId: null }).where(eq(posts.id, options.postId));
    await tx.delete(mediaAssets).where(eq(mediaAssets.id, oldFeaturedImageId));
  }

  if (options.featuredImageUrl.trim()) {
    featuredImageId = crypto.randomUUID();
    await tx.insert(mediaAssets).values({
      id: featuredImageId,
      ownerUserId: options.authorId,
      provider: getMediaProvider(options.featuredImageUrl),
      publicId: getMediaPublicId(options.featuredImageUrl),
      secureUrl: options.featuredImageUrl,
      resourceType: "image",
      format: getMediaFormat(options.featuredImageUrl),
      width: null,
      height: null,
      bytes: null,
      altText: options.featuredImageAlt.trim() || null,
      createdAt: new Date(),
    });
  }

  await tx.update(posts).set({ featuredImageId }).where(eq(posts.id, options.postId));

  for (const entry of options.galleryEntries) {
    if (!entry.imageUrl.trim()) {
      continue;
    }

    const mediaAssetId = crypto.randomUUID();
    await tx.insert(mediaAssets).values({
      id: mediaAssetId,
      ownerUserId: options.authorId,
      provider: getMediaProvider(entry.imageUrl),
      publicId: getMediaPublicId(entry.imageUrl),
      secureUrl: entry.imageUrl,
      resourceType: "image",
      format: getMediaFormat(entry.imageUrl),
      width: null,
      height: null,
      bytes: null,
      altText: entry.altText,
      createdAt: new Date(),
      exifTakenAt: entry.exifTakenAt,
      exifLat: entry.exifLat,
      exifLng: entry.exifLng,
      exifCameraMake: entry.exifCameraMake,
      exifCameraModel: entry.exifCameraModel,
      exifLensModel: entry.exifLensModel,
      exifAperture: entry.exifAperture,
      exifShutterSpeed: entry.exifShutterSpeed,
      exifIso: entry.exifIso,
    });

    await tx.insert(postImages).values({
      id: crypto.randomUUID(),
      postId: options.postId,
      mediaAssetId,
      sortOrder: entry.sortOrder,
      focalX: entry.focalX,
      focalY: entry.focalY,
      caption: entry.altText,
      createdAt: new Date(),
    });
  }
}

function buildPostSavePayload(values: ReturnType<typeof parseFormData>) {
  const derivedContent = derivePostContent(values.contentJson, values.excerpt);

  return {
    derivedContent,
    scheduledPublishTime: normalizeScheduledTimestamp(
      values.scheduledPublishTime,
      values.scheduledPublishOffsetMinutes,
      values.status,
    ),
  };
}

// createAdminPostAction
// Input: FormData matching adminPostFormSchema
// Output: redirect to /admin/posts/:postId/edit?saved=1
// Auth: Admin (Auth.js GitHub)
// UI: submit editor form, then show saved state on edit screen
export async function createAdminPostAction(formData: FormData) {
  const authorId = await ensureAdmin();
  const values = parseFormData(formData);
  const { derivedContent, scheduledPublishTime } = buildPostSavePayload(values);
  const db = getDb();
  const [seriesId, geo, slug] = await Promise.all([
    ensureSeriesId(values.seriesTitle ?? ""),
    values.locationName ? geocodeLocation(values.locationName) : Promise.resolve(null),
    generateUniquePostSlug(values.slug.trim() || values.title),
  ]);
  const postId = crypto.randomUUID();
  const now = new Date();
  const publishedAt = values.status === "published" ? now : null;

  await db.transaction(async (tx) => {
    const categoryId = await ensureCategoryIdTx(tx, values.categoryName);

    await tx.insert(posts).values({
      id: postId,
      title: values.title,
      slug,
      contentJson: derivedContent.canonicalContentJson,
      contentFormat: derivedContent.contentFormat,
      contentHtml: derivedContent.contentHtml,
      contentPlainText: derivedContent.contentPlainText,
      excerpt: derivedContent.excerpt,
      status: values.status,
      layoutType: values.layoutType,
      publishedAt,
      scheduledPublishTime,
      authorId,
      categoryId,
      seriesId,
      seriesOrder: values.seriesOrder ?? null,
      featuredImageId: null,
      externalGalleryUrl: null,
      externalGalleryLabel: null,
      locationName: values.locationName || null,
      locationLat: geo?.lat ?? null,
      locationLng: geo?.lng ?? null,
      locationZoom: geo?.zoom ?? null,
      iovanderUrl: values.iovanderUrl || null,
      createdAt: now,
      updatedAt: now,
    });

    await syncTagsForPostTx(tx, postId, parseTagNames(values.tagNames));
    await replacePostMediaTx(tx, {
      postId,
      authorId,
      featuredImageUrl: values.featuredImageUrl,
      featuredImageAlt: values.featuredImageAlt,
      galleryEntries: parseGalleryEntries(values.galleryEntries),
    });
  });

  revalidatePath("/");
  revalidatePath("/admin");
  redirect(`/admin/posts/${postId}/edit?saved=1`);
}

// updateAdminPostAction
// Input: postId + FormData matching adminPostFormSchema
// Output: redirect to /admin/posts/:postId/edit?saved=1
// Auth: Admin (Auth.js GitHub)
// UI: submit editor form, invalidate preview links, keep edit page current
export async function updateAdminPostAction(postId: string, formData: FormData) {
  const authorId = await ensureAdmin();
  const values = parseFormData(formData);
  const { derivedContent, scheduledPublishTime } = buildPostSavePayload(values);
  const db = getDb();
  const [existingPost, seriesId, geo, slug] = await Promise.all([
    db.query.posts.findFirst({
      where: eq(posts.id, postId),
      columns: { publishedAt: true, title: true, contentJson: true, excerpt: true },
    }),
    ensureSeriesId(values.seriesTitle ?? ""),
    values.locationName ? geocodeLocation(values.locationName) : Promise.resolve(null),
    generateUniquePostSlug(values.slug.trim() || values.title, postId),
  ]);
  const now = new Date();
  const publishedAt = values.status === "published" ? (existingPost?.publishedAt ?? now) : null;

  await db.transaction(async (tx) => {
    const categoryId = await ensureCategoryIdTx(tx, values.categoryName);

    await tx
      .update(posts)
      .set({
        title: values.title,
        slug,
        contentJson: derivedContent.canonicalContentJson,
        contentFormat: derivedContent.contentFormat,
        contentHtml: derivedContent.contentHtml,
        contentPlainText: derivedContent.contentPlainText,
        excerpt: derivedContent.excerpt,
        status: values.status,
        layoutType: values.layoutType,
        publishedAt,
        scheduledPublishTime,
        categoryId,
        seriesId,
        seriesOrder: values.seriesOrder ?? null,
        locationName: values.locationName || null,
        locationLat: geo?.lat ?? null,
        locationLng: geo?.lng ?? null,
        locationZoom: geo?.zoom ?? null,
        iovanderUrl: values.iovanderUrl || null,
        updatedAt: now,
      })
      .where(eq(posts.id, postId));

    await syncTagsForPostTx(tx, postId, parseTagNames(values.tagNames));
    await replacePostMediaTx(tx, {
      postId,
      authorId,
      featuredImageUrl: values.featuredImageUrl,
      featuredImageAlt: values.featuredImageAlt,
      galleryEntries: parseGalleryEntries(values.galleryEntries),
    });
  });

  // Capture a revision snapshot of the pre-update state.
  // Best-effort: a revision failure must not block the save.
  if (existingPost) {
    try {
      await createPostRevision({
        postId,
        title: existingPost.title,
        contentJson: existingPost.contentJson,
        excerpt: existingPost.excerpt ?? null,
        savedByUserId: authorId,
      });
    } catch {
      // Non-fatal: log to stderr so it's visible in Vercel logs but don't rethrow.
      console.error(`[revisions] Failed to create revision for post ${postId}`);
    }
  }

  await revokePostPreviewTokens(postId);

  revalidatePath("/");
  revalidatePath("/admin");
  revalidatePath(`/posts/${slug}`);
  redirect(`/admin/posts/${postId}/edit?saved=1`);
}

const bulkPostIdsSchema = z.object({
  postIds: z.array(z.string().min(1)).min(1).max(100),
});

// bulkPublishPosts
// Input: { postIds: string[] }
// Output: PostPublishResult
// Auth: Admin (Auth.js GitHub)
// UI: allow mixed selection; show updated/unchanged/missing counts in bulk toolbar
export async function bulkPublishPosts(postIds: string[]): Promise<PostPublishResult> {
  await ensureAdmin();
  const { postIds: validPostIds } = bulkPostIdsSchema.parse({ postIds });
  return publishPosts(validPostIds);
}

// bulkUnpublishPosts
// Input: { postIds: string[] }
// Output: PostPublishResult
// Auth: Admin (Auth.js GitHub)
// UI: allow mixed selection; show updated/unchanged/missing counts in bulk toolbar
export async function bulkUnpublishPosts(postIds: string[]): Promise<PostPublishResult> {
  await ensureAdmin();
  const { postIds: validPostIds } = bulkPostIdsSchema.parse({ postIds });
  return unpublishPosts(validPostIds);
}

const clonePostSchema = z.object({
  postId: z.string().min(1),
});

// clonePost
// Input: { postId: string }
// Output: { postId: string; slug: string; title: string; status: "draft" }
// Auth: Admin (Auth.js GitHub)
// UI: clone content/taxonomy/media refs into a new draft, then redirect to the new edit page
export async function clonePost(postId: string) {
  await ensureAdmin();
  const { postId: validPostId } = clonePostSchema.parse({ postId });
  const result = await clonePostById(validPostId);
  revalidatePath("/admin");
  return result;
}

const postPreviewRequestSchema = z.object({
  postId: z.string().min(1),
});

// createPostPreviewLinkAction
// Input: { postId: string }
// Output: { postId: string; previewPath: string; token: string; expiresAt: string }
// Auth: Admin (Auth.js GitHub)
// UI: call when user clicks Preview; open returned previewPath in a new tab and refresh after saves
export async function createPostPreviewLinkAction(postId: string) {
  const adminUserId = await ensureAdmin();
  const { postId: validPostId } = postPreviewRequestSchema.parse({ postId });
  return createPostPreviewAccess(validPostId, adminUserId);
}

// validatePostContentWarningsAction
// Input: { contentJson: string; excerpt?: string | null }
// Output: { warnings: TiptapImageAltWarning[]; excerpt: string | null }
// Auth: Admin (Auth.js GitHub)
// UI: run during editor changes or pre-publish review to surface non-blocking alt-text warnings
export async function validatePostContentWarningsAction(contentJson: string, excerpt?: string | null) {
  await ensureAdmin();
  const payload = derivePostContent(contentJson, excerpt ?? null);
  return {
    warnings: payload.imageAltWarnings,
    excerpt: payload.excerpt,
  };
}

const deletePostSchema = z.object({
  postId: z.string().min(1),
});

// deletePostAction
// Input: { postId: string }
// Output: PostDeleteResult
// Auth: Admin (Auth.js GitHub)
// UI: single post delete from dashboard row action, with confirmation dialog
export async function deletePostAction(postId: string): Promise<PostDeleteResult> {
  await ensureAdmin();
  const { postId: validPostId } = deletePostSchema.parse({ postId });
  return deletePosts([validPostId]);
}

// bulkDeletePosts
// Input: { postIds: string[] }
// Output: PostDeleteResult
// Auth: Admin (Auth.js GitHub)
// UI: bulk delete from dashboard toolbar, with confirmation dialog
export async function bulkDeletePosts(postIds: string[]): Promise<PostDeleteResult> {
  await ensureAdmin();
  const { postIds: validPostIds } = bulkPostIdsSchema.parse({ postIds });
  return deletePosts(validPostIds);
}
