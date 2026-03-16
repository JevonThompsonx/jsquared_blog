"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";

import { categories, mediaAssets, postImages, postTags, posts, tags } from "@/drizzle/schema";
import { ensureSeriesId } from "@/server/dal/series";
import { requireAdminSession } from "@/lib/auth/session";
import { htmlToPlainText, renderTiptapJson } from "@/lib/content";
import { getDb } from "@/lib/db";
import { slugify } from "@/lib/utils";
import { adminPostFormSchema } from "@/server/forms/admin-post-form";

function normalizeScheduledTimestamp(value: string, status: "draft" | "published" | "scheduled") {
  if (status !== "scheduled") {
    return null;
  }

  return new Date(value);
}

async function ensureAdmin() {
  const session = await requireAdminSession();
  if (!session?.user?.id) {
    redirect("/admin?error=AccessDenied");
  }

  return session.user.id;
}

async function ensureCategoryId(categoryName: string | undefined) {
  const trimmedName = categoryName?.trim();
  if (!trimmedName) {
    return null;
  }

  const db = getDb();
  const categorySlug = slugify(trimmedName);
  const existingCategory = await db.query.categories.findFirst({
    where: eq(categories.slug, categorySlug),
    columns: { id: true },
  });

  if (existingCategory) {
    return existingCategory.id;
  }

  const categoryId = `category-${categorySlug}`;

  await db
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

    const data = (await res.json()) as Array<{ lat: string; lon: string; type: string }>;
    const first = data[0];
    if (!first) {
      return null;
    }

    const lat = parseFloat(first.lat);
    const lng = parseFloat(first.lon);

    // Determine default zoom based on result type
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

function parseGalleryEntries(value: string) {
  try {
    const parsed = JSON.parse(value) as Array<{
      imageUrl?: string;
      altText?: string | null;
      sortOrder?: number;
      focalX?: number | null;
      focalY?: number | null;
    }>;

    return parsed
      .filter((entry): entry is NonNullable<typeof entry> & { imageUrl: string } => Boolean(entry?.imageUrl?.trim()))
      .map((entry, index) => ({
        imageUrl: entry.imageUrl,
        altText: entry.altText?.trim() || null,
        sortOrder: typeof entry.sortOrder === "number" ? entry.sortOrder : index,
        focalX: typeof entry.focalX === "number" ? entry.focalX : null,
        focalY: typeof entry.focalY === "number" ? entry.focalY : null,
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

async function syncTagsForPost(postId: string, tagNames: string[]) {
  const db = getDb();
  await db.delete(postTags).where(eq(postTags.postId, postId));

  for (const tagName of tagNames) {
    const tagId = `tag-${slugify(tagName)}`;
    await db
      .insert(tags)
      .values({
        id: tagId,
        name: tagName,
        slug: slugify(tagName),
      })
      .onConflictDoUpdate({
        target: tags.id,
        set: {
          name: tagName,
          slug: slugify(tagName),
        },
      });

    await db.insert(postTags).values({ postId, tagId }).onConflictDoNothing();
  }
}

async function replacePostMedia(options: {
  postId: string;
  authorId: string;
  featuredImageUrl: string;
  featuredImageAlt: string;
  galleryEntries: Array<{ imageUrl: string; altText: string | null; sortOrder: number; focalX: number | null; focalY: number | null }>;
}) {
  const db = getDb();

  const existingPost = await db.query.posts.findFirst({
    where: eq(posts.id, options.postId),
    columns: { featuredImageId: true },
  });

  const existingGalleryRows = await db
    .select({ mediaAssetId: postImages.mediaAssetId })
    .from(postImages)
    .where(eq(postImages.postId, options.postId));

  await db.delete(postImages).where(eq(postImages.postId, options.postId));

  for (const row of existingGalleryRows) {
    await db.delete(mediaAssets).where(eq(mediaAssets.id, row.mediaAssetId));
  }

  let featuredImageId: string | null = existingPost?.featuredImageId ?? null;
  if (featuredImageId) {
    const oldFeaturedImageId = featuredImageId;
    featuredImageId = null;
    // Unlink the FK before deleting the media asset to avoid FOREIGN KEY constraint
    await db.update(posts).set({ featuredImageId: null }).where(eq(posts.id, options.postId));
    await db.delete(mediaAssets).where(eq(mediaAssets.id, oldFeaturedImageId));
  }

  if (options.featuredImageUrl.trim()) {
    featuredImageId = crypto.randomUUID();
    await db.insert(mediaAssets).values({
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

  await db.update(posts).set({ featuredImageId }).where(eq(posts.id, options.postId));

  for (const entry of options.galleryEntries) {
    if (!entry.imageUrl.trim()) {
      continue;
    }

    const mediaAssetId = crypto.randomUUID();
    await db.insert(mediaAssets).values({
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
    });

    await db.insert(postImages).values({
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

export async function createAdminPostAction(formData: FormData) {
  const authorId = await ensureAdmin();
  const values = parseFormData(formData);
  const db = getDb();
  const [categoryId, seriesId, geo] = await Promise.all([
    ensureCategoryId(values.categoryName),
    ensureSeriesId(values.seriesTitle ?? ""),
    values.locationName ? geocodeLocation(values.locationName) : Promise.resolve(null),
  ]);
  const postId = crypto.randomUUID();
  const slug = slugify(values.slug.trim() || values.title);
  const now = new Date();
  const publishedAt = values.status === "published" ? now : null;
  const scheduledPublishTime = normalizeScheduledTimestamp(values.scheduledPublishTime, values.status);

  await db.insert(posts).values({
    id: postId,
    title: values.title,
    slug,
    contentJson: values.contentJson,
    excerpt: values.excerpt || htmlToPlainText(renderTiptapJson(values.contentJson) ?? "").slice(0, 280) || null,
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

  await syncTagsForPost(postId, parseTagNames(values.tagNames));
  await replacePostMedia({
    postId,
    authorId,
    featuredImageUrl: values.featuredImageUrl,
    featuredImageAlt: values.featuredImageAlt,
    galleryEntries: parseGalleryEntries(values.galleryEntries),
  });

  revalidatePath("/");
  revalidatePath("/admin");
  redirect((`/admin/posts/${postId}/edit?saved=1`) as never);
}

export async function updateAdminPostAction(postId: string, formData: FormData) {
  const authorId = await ensureAdmin();
  const values = parseFormData(formData);
  const db = getDb();
  const [categoryId, seriesId, geo] = await Promise.all([
    ensureCategoryId(values.categoryName),
    ensureSeriesId(values.seriesTitle ?? ""),
    values.locationName ? geocodeLocation(values.locationName) : Promise.resolve(null),
  ]);
  const slug = slugify(values.slug.trim() || values.title);
  const now = new Date();
  const scheduledPublishTime = normalizeScheduledTimestamp(values.scheduledPublishTime, values.status);

  await db
    .update(posts)
    .set({
      title: values.title,
      slug,
      contentJson: values.contentJson,
      excerpt: values.excerpt || htmlToPlainText(renderTiptapJson(values.contentJson) ?? "").slice(0, 280) || null,
      status: values.status,
      layoutType: values.layoutType,
      publishedAt: values.status === "published" ? now : null,
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

  await syncTagsForPost(postId, parseTagNames(values.tagNames));
  await replacePostMedia({
    postId,
    authorId,
    featuredImageUrl: values.featuredImageUrl,
    featuredImageAlt: values.featuredImageAlt,
    galleryEntries: parseGalleryEntries(values.galleryEntries),
  });

  revalidatePath("/");
  revalidatePath("/admin");
  revalidatePath(`/posts/${slug}`);
  redirect((`/admin/posts/${postId}/edit?saved=1`) as never);
}
