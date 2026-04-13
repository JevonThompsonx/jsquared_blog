"use server";

import { revalidatePath } from "next/cache";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { categories, mediaAssets, postImages, postTags, posts, tags } from "@/drizzle/schema";
import { requireAdminSession } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { normalizeSongMetadataFields } from "@/lib/post-song-metadata";
import { createPostRevision } from "@/server/dal/post-revisions";
import { ensureSeriesId } from "@/server/dal/series";
import { getPostColumnCapabilities } from "@/server/dal/post-column-capabilities";
import { adminPostFormSchema } from "@/server/forms/admin-post-form";
import { derivePostContent } from "@/server/posts/content";
import { clonePostById } from "@/server/posts/clone";
import { deactivateLinkedWishlistPlaces } from "@/server/dal/admin-wishlist-places";
import { createPostPreviewAccess, revokePostPreviewTokens } from "@/server/posts/preview";
import { deletePosts, type PostDeleteResult } from "@/server/posts/delete";
import { publishPosts, unpublishPosts, type PostPublishResult } from "@/server/posts/publish";
import { generateUniquePostSlug } from "@/server/posts/slug";
import { ADMIN_FLASH_COOKIE_NAME, getAdminFlashCookieOptions, type AdminFlashKind } from "@/lib/admin-flash";
import { geocodeLocation, type GeoResult } from "@/lib/geocode";
import { slugify } from "@/lib/utils";

type DbExecutor = Pick<ReturnType<typeof getDb>, "query" | "select" | "insert" | "update" | "delete">;
type AdminReturnRoute = "/admin" | `/admin?${string}`;

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
  if (!Number.isFinite(parsedOffset)) {
    throw new Error("Invalid request");
  }

  const offsetMinutes = parsedOffset;

  const localDateTimeMatch = trimmedValue.match(
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/,
  );

  const localTimestamp = localDateTimeMatch
    ? Date.UTC(
        Number.parseInt(localDateTimeMatch[1], 10),
        Number.parseInt(localDateTimeMatch[2], 10) - 1,
        Number.parseInt(localDateTimeMatch[3], 10),
        Number.parseInt(localDateTimeMatch[4], 10),
        Number.parseInt(localDateTimeMatch[5], 10),
        Number.parseInt(localDateTimeMatch[6] ?? "0", 10),
      )
    : Date.parse(trimmedValue);

  if (Number.isNaN(localTimestamp)) {
    return new Date(Number.NaN);
  }

  return new Date(localTimestamp + offsetMinutes * 60 * 1000);
}

async function ensureAdmin() {
  const session = await requireAdminSession();
  if (session?.user?.role !== "admin" || !session.user.id) {
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
  const parsed = adminPostFormSchema.safeParse({
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
    songTitle: formData.get("songTitle"),
    songArtist: formData.get("songArtist"),
    songUrl: formData.get("songUrl"),
  });

  if (!parsed.success) {
    const contentOnlyFailure = parsed.error.issues.length > 0
      && parsed.error.issues.every((issue) => issue.path[0] === "contentJson");

    if (contentOnlyFailure) {
      throw new Error("Invalid post content");
    }

    throw new Error("Invalid request");
  }

  return parsed.data;
}

function normalizeAdminReturnTo(value: FormDataEntryValue | null): AdminReturnRoute {
  if (typeof value !== "string") {
    return "/admin";
  }

  const trimmedValue = value.trim();
  if (!trimmedValue.startsWith("/admin")) {
    return "/admin";
  }

  try {
    const url = new URL(trimmedValue, "https://jsquaredadventures.com");
    if (url.pathname !== "/admin") {
      return "/admin";
    }

    url.searchParams.delete("postId");
    url.searchParams.delete("saved");
    url.searchParams.delete("cloned");
    url.searchParams.delete("editRemoved");

    const nextSearch = url.searchParams.toString();
    return nextSearch ? `/admin?${nextSearch}` : "/admin";
  } catch {
    return "/admin";
  }
}

function buildAdminPostReturnPath(returnTo: AdminReturnRoute, postId: string, flag: "saved" | "cloned" | "editRemoved"): AdminReturnRoute {
  const url = new URL(returnTo, "https://jsquaredadventures.com");
  url.searchParams.set("postId", postId);
  url.searchParams.set(flag, "1");
  const nextSearch = url.searchParams.toString();
  return nextSearch ? `/admin?${nextSearch}` : "/admin";
}

async function setAdminFlash(kind: AdminFlashKind) {
  const cookieStore = await cookies();
  const headerStore = await headers();
  const forwardedProto = headerStore.get("x-forwarded-proto");
  const isSecure = forwardedProto?.split(",")[0]?.trim() === "https";

  cookieStore.set(ADMIN_FLASH_COOKIE_NAME, kind, getAdminFlashCookieOptions(isSecure));
}

function parseTagNames(value: string) {
  return [...new Set(value.split(",").map((tag) => tag.trim()).filter(Boolean))];
}

function parseUnknownJson(value: string): unknown {
  return JSON.parse(value);
}

function isInvalidPostContentError(error: unknown) {
  return error instanceof SyntaxError || (error instanceof Error && error.message === "Content must be valid Tiptap JSON");
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

const galleryEntriesSchema = z.array(galleryEntrySchema);

function parseGalleryEntries(value: string) {
  let unknownJson: unknown;

  try {
    unknownJson = parseUnknownJson(value);
  } catch {
    throw new Error("Invalid request");
  }

  const parsed = galleryEntriesSchema.safeParse(unknownJson);

  if (!parsed.success) {
    throw new Error("Invalid request");
  }

  return parsed.data
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
  let derivedContent: ReturnType<typeof derivePostContent>;
  const songMetadata = normalizeSongMetadataFields(values);

  try {
    derivedContent = derivePostContent(values.contentJson, values.excerpt);
  } catch (error) {
    if (!isInvalidPostContentError(error)) {
      throw error;
    }

    throw new Error("Invalid post content");
  }

  return {
    derivedContent,
    songMetadata,
    scheduledPublishTime: normalizeScheduledTimestamp(
      values.scheduledPublishTime,
      values.scheduledPublishOffsetMinutes,
      values.status,
    ),
  };
}

function isStablePostContentError(error: unknown) {
  return error instanceof Error && error.message === "Invalid post content";
}

function isStableRequestValidationError(error: unknown) {
  return error instanceof Error && error.message === "Invalid request";
}

function isPostNotFoundError(error: unknown) {
  return error instanceof Error && error.message.toLowerCase().startsWith("post ") && error.message.toLowerCase().includes("not found");
}

// createAdminPostAction
// Input: FormData matching adminPostFormSchema
// Output: redirect to /admin?postId=:postId&saved=1
// Auth: Admin (Auth.js GitHub)
// UI: submit editor form, then show saved state on edit screen
export async function createAdminPostAction(formData: FormData) {
  const authorId = await ensureAdmin();
  const values = parseFormData(formData);
  const galleryEntries = parseGalleryEntries(values.galleryEntries);
  const returnTo = normalizeAdminReturnTo(formData.get("returnTo"));
  let payload: ReturnType<typeof buildPostSavePayload>;

  try {
    payload = buildPostSavePayload(values);
  } catch (error) {
    if (!isStablePostContentError(error) && !isStableRequestValidationError(error)) {
      console.error("[admin-actions] Failed to derive post content during create", error);
      throw new Error("Failed to save post");
    }

    throw error;
  }

  const { derivedContent, scheduledPublishTime, songMetadata } = payload;
  const db = getDb();
  const [seriesId, geo, slug, caps] = await Promise.all([
    ensureSeriesId(values.seriesTitle ?? ""),
    values.locationName ? geocodeLocation(values.locationName) : Promise.resolve(null),
    generateUniquePostSlug(values.slug.trim() || values.title),
    getPostColumnCapabilities(),
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
      publishedAt,
      scheduledPublishTime,
      authorId,
      categoryId,
      seriesId,
      seriesOrder: values.seriesOrder ?? null,
      featuredImageId: null,
      externalGalleryUrl: null,
      externalGalleryLabel: null,
      ...(caps.layoutType ? { layoutType: values.layoutType } : {}),
      ...(caps.locationName ? { locationName: values.locationName || null } : {}),
      ...(caps.locationLat ? { locationLat: geo?.lat ?? null } : {}),
      ...(caps.locationLng ? { locationLng: geo?.lng ?? null } : {}),
      ...(caps.locationZoom ? { locationZoom: geo?.zoom ?? null } : {}),
      ...(caps.iovanderUrl ? { iovanderUrl: values.iovanderUrl || null } : {}),
      ...(caps.songTitle ? { songTitle: songMetadata.songTitle } : {}),
      ...(caps.songArtist ? { songArtist: songMetadata.songArtist } : {}),
      ...(caps.songUrl ? { songUrl: songMetadata.songUrl } : {}),
      createdAt: now,
      updatedAt: now,
    });

    await syncTagsForPostTx(tx, postId, parseTagNames(values.tagNames));
    await replacePostMediaTx(tx, {
      postId,
      authorId,
      featuredImageUrl: values.featuredImageUrl,
      featuredImageAlt: values.featuredImageAlt,
      galleryEntries,
    });
  });

  revalidatePath("/");
  revalidatePath("/admin");
  if (values.status === "published") {
    try {
      await deactivateLinkedWishlistPlaces([postId]);
      revalidatePath("/wishlist");
    } catch (error) {
      console.error(`[admin-actions] Failed to deactivate linked wishlist places for created post ${postId}`, error);
    }
  }
  await setAdminFlash("saved");
  redirect(buildAdminPostReturnPath(returnTo, postId, "saved"));
}

// updateAdminPostAction
// Input: postId + FormData matching adminPostFormSchema
// Output: redirect to /admin?postId=:postId&saved=1
// Auth: Admin (Auth.js GitHub)
// UI: submit editor form, invalidate preview links, keep edit page current
export async function updateAdminPostAction(postId: string, formData: FormData) {
  const authorId = await ensureAdmin();
  const validPostId = parseActionPostId(deletePostSchema, postId);
  const values = parseFormData(formData);
  const galleryEntries = parseGalleryEntries(values.galleryEntries);
  const returnTo = normalizeAdminReturnTo(formData.get("returnTo"));
  let payload: ReturnType<typeof buildPostSavePayload>;

  try {
    payload = buildPostSavePayload(values);
  } catch (error) {
    if (!isStablePostContentError(error) && !isStableRequestValidationError(error)) {
      console.error(`[admin-actions] Failed to derive post content during update for ${validPostId}`, error);
      throw new Error("Failed to save post");
    }

    throw error;
  }

  const { derivedContent, scheduledPublishTime, songMetadata } = payload;
  const db = getDb();
  const caps = await getPostColumnCapabilities();
  const [existingPost, seriesId, geo, slug] = await Promise.all([
    db.query.posts.findFirst({
      where: eq(posts.id, validPostId),
      columns: {
        publishedAt: true,
        title: true,
        contentJson: true,
        excerpt: true,
        ...(caps.songTitle ? { songTitle: true as const } : {}),
        ...(caps.songArtist ? { songArtist: true as const } : {}),
        ...(caps.songUrl ? { songUrl: true as const } : {}),
      },
    }),
    ensureSeriesId(values.seriesTitle ?? ""),
    values.locationName ? geocodeLocation(values.locationName) : Promise.resolve(null),
    generateUniquePostSlug(values.slug.trim() || values.title, validPostId),
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
        publishedAt,
        scheduledPublishTime,
        categoryId,
        seriesId,
        seriesOrder: values.seriesOrder ?? null,
        ...(caps.layoutType ? { layoutType: values.layoutType } : {}),
        ...(caps.locationName ? { locationName: values.locationName || null } : {}),
        ...(caps.locationLat ? { locationLat: geo?.lat ?? null } : {}),
        ...(caps.locationLng ? { locationLng: geo?.lng ?? null } : {}),
        ...(caps.locationZoom ? { locationZoom: geo?.zoom ?? null } : {}),
        ...(caps.iovanderUrl ? { iovanderUrl: values.iovanderUrl || null } : {}),
        ...(caps.songTitle ? { songTitle: songMetadata.songTitle } : {}),
        ...(caps.songArtist ? { songArtist: songMetadata.songArtist } : {}),
        ...(caps.songUrl ? { songUrl: songMetadata.songUrl } : {}),
        updatedAt: now,
        })
        .where(eq(posts.id, validPostId));

    await syncTagsForPostTx(tx, validPostId, parseTagNames(values.tagNames));
    await replacePostMediaTx(tx, {
      postId: validPostId,
      authorId,
      featuredImageUrl: values.featuredImageUrl,
      featuredImageAlt: values.featuredImageAlt,
      galleryEntries,
    });
  });

  // Capture a revision snapshot of the pre-update state.
  // Best-effort: a revision failure must not block the save.
  if (existingPost) {
    try {
      await createPostRevision({
        postId: validPostId,
        title: existingPost.title,
        contentJson: existingPost.contentJson,
        excerpt: existingPost.excerpt ?? null,
        songTitle: caps.songTitle ? (existingPost as { songTitle?: string | null }).songTitle ?? null : null,
        songArtist: caps.songArtist ? (existingPost as { songArtist?: string | null }).songArtist ?? null : null,
        songUrl: caps.songUrl ? (existingPost as { songUrl?: string | null }).songUrl ?? null : null,
        savedByUserId: authorId,
      });
    } catch {
      // Non-fatal: log to stderr so it's visible in Vercel logs but don't rethrow.
      console.error(`[revisions] Failed to create revision for post ${validPostId}`);
    }
  }

  await revokePostPreviewTokens(validPostId);

  revalidatePath("/");
  revalidatePath("/admin");
  revalidatePath(`/posts/${slug}`);
  if (values.status === "published") {
    try {
      await deactivateLinkedWishlistPlaces([validPostId]);
      revalidatePath("/wishlist");
    } catch (error) {
      console.error(`[admin-actions] Failed to deactivate linked wishlist places for updated post ${validPostId}`, error);
    }
  }
  await setAdminFlash("saved");
  redirect(buildAdminPostReturnPath(returnTo, validPostId, "saved"));
}

const actionPostIdSchema = z.string().trim().min(1);

const bulkPostIdsSchema = z.object({
  postIds: z.array(actionPostIdSchema).min(1).max(100),
});

function parseActionPostIds(postIds: string[]) {
  const parsed = bulkPostIdsSchema.safeParse({ postIds });

  if (!parsed.success) {
    throw new Error("Invalid request");
  }

  return parsed.data.postIds;
}

// bulkPublishPosts
// Input: { postIds: string[] }
// Output: PostPublishResult
// Auth: Admin (Auth.js GitHub)
// UI: allow mixed selection; show updated/unchanged/missing counts in bulk toolbar
export async function bulkPublishPosts(postIds: string[]): Promise<PostPublishResult> {
  await ensureAdmin();
  const validPostIds = parseActionPostIds(postIds);

  try {
    return await publishPosts(validPostIds);
  } catch (error) {
    console.error("[admin-actions] Failed to publish posts", error);
    throw new Error("Failed to publish posts");
  }
}

// bulkUnpublishPosts
// Input: { postIds: string[] }
// Output: PostPublishResult
// Auth: Admin (Auth.js GitHub)
// UI: allow mixed selection; show updated/unchanged/missing counts in bulk toolbar
export async function bulkUnpublishPosts(postIds: string[]): Promise<PostPublishResult> {
  await ensureAdmin();
  const validPostIds = parseActionPostIds(postIds);

  try {
    return await unpublishPosts(validPostIds);
  } catch (error) {
    console.error("[admin-actions] Failed to unpublish posts", error);
    throw new Error("Failed to unpublish posts");
  }
}

const clonePostSchema = z.object({
  postId: actionPostIdSchema,
});

function parseActionPostId(schema: z.ZodObject<{ postId: z.ZodString }>, postId: string) {
  const parsed = schema.safeParse({ postId });

  if (!parsed.success) {
    throw new Error("Invalid request");
  }

  return parsed.data.postId;
}

// clonePost
// Input: { postId: string }
// Output: { postId: string; slug: string; title: string; status: "draft" }
// Auth: Admin (Auth.js GitHub)
// UI: clone content/taxonomy/media refs into a new draft, then redirect to the new edit page
export async function clonePost(postId: string) {
  await ensureAdmin();
  const validPostId = parseActionPostId(clonePostSchema, postId);
  let result: Awaited<ReturnType<typeof clonePostById>>;

  try {
    result = await clonePostById(validPostId);
  } catch (error) {
    if (isPostNotFoundError(error)) {
      throw new Error("Post not found");
    }

    console.error(`[admin-actions] Failed to clone post ${validPostId}`, error);
    throw new Error("Failed to clone post");
  }

  try {
    revalidatePath("/admin");
  } catch (error) {
    console.error(`[admin-actions] Failed to revalidate admin after cloning ${validPostId}`, error);
  }

  await setAdminFlash("cloned");

  return result;
}

const postPreviewRequestSchema = z.object({
  postId: actionPostIdSchema,
});

// createPostPreviewLinkAction
// Input: { postId: string }
// Output: { postId: string; previewPath: string; token: string; expiresAt: string }
// Auth: Admin (Auth.js GitHub)
// UI: call when user clicks Preview; open returned previewPath in a new tab and refresh after saves
export async function createPostPreviewLinkAction(postId: string) {
  const adminUserId = await ensureAdmin();
  const validPostId = parseActionPostId(postPreviewRequestSchema, postId);

  try {
    return await createPostPreviewAccess(validPostId, adminUserId);
  } catch (error) {
    if (isPostNotFoundError(error)) {
      throw new Error("Post not found");
    }

    console.error(`[admin-actions] Failed to create preview for ${validPostId}`, error);
    throw new Error("Failed to create preview");
  }
}

// validatePostContentWarningsAction
// Input: { contentJson: string; excerpt?: string | null }
// Output: { warnings: TiptapImageAltWarning[]; excerpt: string | null }
// Auth: Admin (Auth.js GitHub)
// UI: run during editor changes or pre-publish review to surface non-blocking alt-text warnings
export async function validatePostContentWarningsAction(contentJson: string, excerpt?: string | null) {
  await ensureAdmin();
  let payload: ReturnType<typeof derivePostContent>;

  try {
    payload = derivePostContent(contentJson, excerpt ?? null);
  } catch (error) {
    if (!isInvalidPostContentError(error)) {
      console.error("[admin-actions] Failed to validate post content warnings", error);
      throw new Error("Failed to validate post content");
    }

    throw new Error("Invalid post content");
  }

  return {
    warnings: payload.imageAltWarnings,
    excerpt: payload.excerpt,
  };
}

const deletePostSchema = z.object({
  postId: actionPostIdSchema,
});

// deletePostAction
// Input: { postId: string }
// Output: PostDeleteResult
// Auth: Admin (Auth.js GitHub)
// UI: single post delete from dashboard row action, with confirmation dialog
export async function deletePostAction(postId: string): Promise<PostDeleteResult> {
  await ensureAdmin();
  const validPostId = parseActionPostId(deletePostSchema, postId);

  try {
    return await deletePosts([validPostId]);
  } catch (error) {
    console.error(`[admin-actions] Failed to delete post ${validPostId}`, error);
    throw new Error("Failed to delete post");
  }
}

// bulkDeletePosts
// Input: { postIds: string[] }
// Output: PostDeleteResult
// Auth: Admin (Auth.js GitHub)
// UI: bulk delete from dashboard toolbar, with confirmation dialog
export async function bulkDeletePosts(postIds: string[]): Promise<PostDeleteResult> {
  await ensureAdmin();
  const validPostIds = parseActionPostIds(postIds);

  try {
    return await deletePosts(validPostIds);
  } catch (error) {
    console.error("[admin-actions] Failed to delete posts", error);
    throw new Error("Failed to delete posts");
  }
}
