import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { and, eq, inArray, sql } from "drizzle-orm";

import { getDb } from "../src/lib/db-core";
import { loadEnvironmentFiles } from "../src/lib/env-loader";
import { htmlToPlainText, sanitizeRichTextHtml } from "../src/lib/content";
import { slugify } from "../src/lib/utils";
import {
  authAccounts,
  categories,
  mediaAssets,
  postImages,
  postTags,
  posts,
  profiles,
  tags,
  users,
} from "../src/drizzle/schema";

loadEnvironmentFiles();

type SupabaseProfile = {
  id: string;
  username: string | null;
  avatar_url: string | null;
  role: string | null;
  theme_preference: string | null;
  bio?: string | null;
  location?: string | null;
  favorite_category?: string | null;
  favorite_destination?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type SupabasePost = {
  id: number;
  title: string;
  description: string | null;
  image_url: string | null;
  category: string | null;
  author_id: string;
  type: "split-horizontal" | "split-vertical" | "hover" | null;
  status: "draft" | "published" | "scheduled";
  scheduled_for?: string | null;
  published_at?: string | null;
  created_at: string;
};

type LegacyLayoutType = "standard" | "split-horizontal" | "split-vertical" | "hover";

type SupabasePostImage = {
  id: number;
  post_id: number;
  image_url: string;
  sort_order: number;
  focal_point?: string | null;
  alt_text?: string | null;
  created_at: string;
};

type SupabaseTag = {
  id: number;
  name: string;
  slug: string;
};

type SupabasePostTag = {
  post_id: number;
  tag_id: number;
};

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function mapUserRole(role: string | null): "reader" | "author" | "admin" {
  if (role === "admin") {
    return "admin";
  }

  return "author";
}

function toTimestamp(value: string | null | undefined): Date {
  if (!value) {
    return new Date();
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

function toNullableTimestamp(value: string | null | undefined): Date | null {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function toLegacyUserId(profileId: string): string {
  return `legacy-user-${profileId}`;
}

const UNKNOWN_AUTHOR_SOURCE_ID = "unknown";

function toUnknownLegacyUserId(): string {
  return toLegacyUserId(UNKNOWN_AUTHOR_SOURCE_ID);
}

function toLegacyAuthAccountId(profileId: string): string {
  return `legacy-auth-supabase-${profileId}`;
}

function toCategoryId(name: string): string {
  return `legacy-category-${slugify(name)}`;
}

function toLegacyPostId(postId: number): string {
  return `legacy-post-${postId}`;
}

function toLegacyPostSlug(post: Pick<SupabasePost, "id" | "title">): string {
  return `${post.id}-${slugify(post.title)}`;
}

function toLegacyMediaId(source: "featured" | "gallery", postId: number, imageId?: number): string {
  return source === "featured"
    ? `legacy-media-featured-${postId}`
    : `legacy-media-gallery-${imageId ?? postId}`;
}

function toLegacyPostImageId(imageId: number): string {
  return `legacy-post-image-${imageId}`;
}

function toLegacyTagId(tagId: number): string {
  return `legacy-tag-${tagId}`;
}

function extractPublicId(imageUrl: string): string {
  return imageUrl.replace(/^https?:\/\//, "");
}

function parseFocalPoint(focalPoint: string | null | undefined): { focalX: number | null; focalY: number | null } {
  if (!focalPoint) {
    return { focalX: null, focalY: null };
  }

  const match = focalPoint.match(/^(\d{1,3})%\s+(\d{1,3})%$/);
  if (!match) {
    return { focalX: null, focalY: null };
  }

  return {
    focalX: Number(match[1]),
    focalY: Number(match[2]),
  };
}

function buildLegacyContentJson(description: string | null): string {
  const sanitizedHtml = sanitizeRichTextHtml(description);

  return JSON.stringify({
    type: "legacy-html",
    html: sanitizedHtml,
  });
}

function mapLegacyLayoutType(value: SupabasePost["type"]): LegacyLayoutType {
  if (value === "split-horizontal" || value === "split-vertical" || value === "hover") {
    return value;
  }

  return "standard";
}

async function fetchAllRows<T>(fetchPage: (from: number, to: number) => Promise<T[]>): Promise<T[]> {
  const pageSize = 1000;
  let from = 0;
  const rows: T[] = [];

  while (true) {
    const page = await fetchPage(from, from + pageSize - 1);
    rows.push(...page);

    if (page.length < pageSize) {
      return rows;
    }

    from += pageSize;
  }
}

async function fetchProfilesPage(
  supabase: SupabaseClient,
  from: number,
  to: number,
): Promise<SupabaseProfile[]> {
  const selectCandidates = [
    "id, username, avatar_url, role, theme_preference, bio, location, favorite_category, favorite_destination",
    "id, username, avatar_url, role, theme_preference",
  ];

  for (const selectClause of selectCandidates) {
    const { data, error } = await supabase
      .from("profiles")
      .select(selectClause)
      .range(from, to);

    if (!error) {
      return (data ?? []) as unknown as SupabaseProfile[];
    }
  }

  throw new Error("Failed to fetch profiles with the known schema variants.");
}

async function fetchPostImagesPage(
  supabase: SupabaseClient,
  from: number,
  to: number,
): Promise<SupabasePostImage[]> {
  const selectCandidates = [
    "id, post_id, image_url, sort_order, focal_point, alt_text, created_at",
    "id, post_id, image_url, sort_order, created_at",
  ];

  for (const selectClause of selectCandidates) {
    const { data, error } = await supabase
      .from("post_images")
      .select(selectClause)
      .order("id", { ascending: true })
      .range(from, to);

    if (!error) {
      return (data ?? []) as unknown as SupabasePostImage[];
    }
  }

  throw new Error("Failed to fetch post images with the known schema variants.");
}

async function main() {
  const supabaseUrl = requireEnv("SUPABASE_URL");
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? requireEnv("SUPABASE_ANON_KEY");

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const db = getDb();

  const [profileRows, postRows, imageRows, tagRows, postTagRows] = await Promise.all([
    fetchAllRows((from, to) => fetchProfilesPage(supabase, from, to)),
    fetchAllRows(async (from, to) => {
      const { data, error } = await supabase
        .from("posts")
        .select("id, title, description, image_url, category, author_id, type, status, scheduled_for, published_at, created_at")
        .order("id", { ascending: true })
        .range(from, to);

      if (error) {
        throw new Error(`Failed to fetch posts: ${error.message}`);
      }

      return (data ?? []) as SupabasePost[];
    }),
    fetchAllRows((from, to) => fetchPostImagesPage(supabase, from, to)),
    fetchAllRows(async (from, to) => {
      const { data, error } = await supabase
        .from("tags")
        .select("id, name, slug")
        .order("id", { ascending: true })
        .range(from, to);

      if (error) {
        throw new Error(`Failed to fetch tags: ${error.message}`);
      }

      return (data ?? []) as SupabaseTag[];
    }),
    fetchAllRows(async (from, to) => {
      const { data, error } = await supabase
        .from("post_tags")
        .select("post_id, tag_id")
        .range(from, to);

      if (error) {
        throw new Error(`Failed to fetch post_tags: ${error.message}`);
      }

      return (data ?? []) as SupabasePostTag[];
    }),
  ]);

  const distinctCategories = [...new Set(postRows.map((post) => post.category?.trim()).filter((value): value is string => Boolean(value)))];
  const profileIds = new Set(profileRows.map((profile) => profile.id));
  const distinctAuthorIds = [...new Set(postRows.map((post) => post.author_id).filter((value): value is string => Boolean(value)))];
  const missingAuthorIds = distinctAuthorIds.filter((authorId) => !profileIds.has(authorId));
  const requiresUnknownAuthor = postRows.some((post) => !post.author_id);

  const supplementalProfiles: SupabaseProfile[] = [
    ...missingAuthorIds.map((authorId) => ({
      id: authorId,
      username: `legacy-${authorId.slice(0, 8)}`,
      avatar_url: null,
      role: "author",
      theme_preference: null,
      bio: null,
      created_at: null,
      updated_at: null,
    })),
    ...(requiresUnknownAuthor
      ? [{
          id: UNKNOWN_AUTHOR_SOURCE_ID,
          username: "legacy-import",
          avatar_url: null,
          role: "author",
          theme_preference: null,
          bio: null,
          created_at: null,
          updated_at: null,
        } satisfies SupabaseProfile]
      : []),
  ];

  const allProfiles = [...profileRows, ...supplementalProfiles];
  const allProfileIds = new Set(allProfiles.map((profile) => profile.id));

  function resolveImportedUserId(authorId: string | null | undefined): string {
    if (authorId && allProfileIds.has(authorId)) {
      return toLegacyUserId(authorId);
    }

    return toUnknownLegacyUserId();
  }

  const imagesByPostId = new Map<number, SupabasePostImage[]>();
  for (const image of imageRows) {
    const existing = imagesByPostId.get(image.post_id) ?? [];
    existing.push(image);
    imagesByPostId.set(image.post_id, existing);
  }

  const importedPostIds = postRows.map((post) => toLegacyPostId(post.id));
  const importedUserIds = allProfiles.map((profile) => toLegacyUserId(profile.id));
  const importedTagIds = tagRows.map((tag) => toLegacyTagId(tag.id));
  const importedCategoryIds = distinctCategories.map((category) => toCategoryId(category));
  const featuredMediaIds = postRows.filter((post) => post.image_url).map((post) => toLegacyMediaId("featured", post.id));
  const galleryMediaIds = imageRows.map((image) => toLegacyMediaId("gallery", image.post_id, image.id));
  const importedMediaIds = [...featuredMediaIds, ...galleryMediaIds];
  const importedPostImageIds = imageRows.map((image) => toLegacyPostImageId(image.id));
  const importedAuthAccountIds = allProfiles.map((profile) => toLegacyAuthAccountId(profile.id));

  await db.transaction(async (tx) => {
    if (importedPostImageIds.length > 0) {
      await tx.delete(postImages).where(inArray(postImages.id, importedPostImageIds));
    }

    if (importedPostIds.length > 0) {
      await tx.delete(postTags).where(inArray(postTags.postId, importedPostIds));
      await tx.delete(posts).where(inArray(posts.id, importedPostIds));
    }

    if (importedMediaIds.length > 0) {
      await tx.delete(mediaAssets).where(inArray(mediaAssets.id, importedMediaIds));
    }

    if (importedTagIds.length > 0) {
      await tx.delete(tags).where(inArray(tags.id, importedTagIds));
    }

    if (importedCategoryIds.length > 0) {
      await tx.delete(categories).where(inArray(categories.id, importedCategoryIds));
    }

    if (importedAuthAccountIds.length > 0) {
      await tx.delete(authAccounts).where(inArray(authAccounts.id, importedAuthAccountIds));
    }

    if (importedUserIds.length > 0) {
      await tx.delete(profiles).where(inArray(profiles.userId, importedUserIds));
      await tx.delete(users).where(inArray(users.id, importedUserIds));
    }

    if (allProfiles.length > 0) {
      await tx.insert(users).values(
        allProfiles.map((profile) => ({
          id: toLegacyUserId(profile.id),
          primaryEmail: `${profile.username ?? profile.id}@legacy.supabase.local`,
          role: mapUserRole(profile.role),
          createdAt: toTimestamp(profile.created_at),
          updatedAt: toTimestamp(profile.updated_at ?? profile.created_at),
        }))
      );

      await tx.insert(profiles).values(
        allProfiles.map((profile) => ({
          userId: toLegacyUserId(profile.id),
          displayName: profile.username ?? `user-${profile.id.slice(0, 8)}`,
          avatarUrl: profile.avatar_url,
          bio: profile.bio ?? null,
          themePreference: profile.theme_preference ?? null,
          createdAt: toTimestamp(profile.created_at),
          updatedAt: toTimestamp(profile.updated_at ?? profile.created_at),
        }))
      );

      await tx.insert(authAccounts).values(
        allProfiles.map((profile) => ({
          id: toLegacyAuthAccountId(profile.id),
          userId: toLegacyUserId(profile.id),
          provider: "supabase" as const,
          providerUserId: profile.id,
          providerEmail: null,
          createdAt: toTimestamp(profile.created_at),
        }))
      );
    }

    if (distinctCategories.length > 0) {
      await tx.insert(categories).values(
        distinctCategories.map((categoryName) => ({
          id: toCategoryId(categoryName),
          name: categoryName,
          slug: slugify(categoryName),
          description: null,
        }))
      );
    }

    if (tagRows.length > 0) {
      await tx.insert(tags).values(
        tagRows.map((tag) => ({
          id: toLegacyTagId(tag.id),
          name: tag.name,
          slug: tag.slug,
        }))
      );
    }

    const mediaRows = [
      ...postRows
        .filter((post) => Boolean(post.image_url))
        .map((post) => ({
          id: toLegacyMediaId("featured", post.id),
          ownerUserId: resolveImportedUserId(post.author_id),
          provider: "supabase" as const,
          publicId: extractPublicId(post.image_url ?? ""),
          secureUrl: post.image_url ?? "",
          resourceType: "image" as const,
          format: post.image_url?.split(".").pop()?.split("?")[0] ?? null,
          width: null,
          height: null,
          bytes: null,
          altText: post.title,
          createdAt: toTimestamp(post.created_at),
        })),
      ...imageRows.map((image) => ({
        id: toLegacyMediaId("gallery", image.post_id, image.id),
        ownerUserId: resolveImportedUserId(postRows.find((post) => post.id === image.post_id)?.author_id),
        provider: "supabase" as const,
        publicId: extractPublicId(image.image_url),
        secureUrl: image.image_url,
        resourceType: "image" as const,
        format: image.image_url.split(".").pop()?.split("?")[0] ?? null,
        width: null,
        height: null,
        bytes: null,
        altText: image.alt_text ?? null,
        createdAt: toTimestamp(image.created_at),
      })),
    ];

    if (mediaRows.length > 0) {
      await tx.insert(mediaAssets).values(mediaRows);
    }

    if (postRows.length > 0) {
      await tx.insert(posts).values(
        postRows.map((post) => ({
          id: toLegacyPostId(post.id),
          title: post.title,
          slug: toLegacyPostSlug(post),
          contentJson: buildLegacyContentJson(post.description),
          excerpt: htmlToPlainText(post.description).slice(0, 280) || null,
          status: post.status,
          layoutType: mapLegacyLayoutType(post.type),
          publishedAt: toNullableTimestamp(post.published_at),
          scheduledPublishTime: toNullableTimestamp(post.scheduled_for),
          authorId: resolveImportedUserId(post.author_id),
          categoryId: post.category ? toCategoryId(post.category) : null,
          featuredImageId: post.image_url ? toLegacyMediaId("featured", post.id) : null,
          externalGalleryUrl: null,
          externalGalleryLabel: null,
          createdAt: toTimestamp(post.created_at),
          updatedAt: toNullableTimestamp(post.published_at) ?? toTimestamp(post.created_at),
        }))
      );
    }

    if (imageRows.length > 0) {
      await tx.insert(postImages).values(
        imageRows.map((image) => {
          const focal = parseFocalPoint(image.focal_point);
          return {
            id: toLegacyPostImageId(image.id),
            postId: toLegacyPostId(image.post_id),
            mediaAssetId: toLegacyMediaId("gallery", image.post_id, image.id),
            sortOrder: image.sort_order,
            focalX: focal.focalX,
            focalY: focal.focalY,
            caption: image.alt_text ?? null,
            createdAt: toTimestamp(image.created_at),
          };
        })
      );
    }

    if (postTagRows.length > 0) {
      await tx.insert(postTags).values(
        postTagRows.map((postTag) => ({
          postId: toLegacyPostId(postTag.post_id),
          tagId: toLegacyTagId(postTag.tag_id),
        }))
      );
    }
  });

  const [userCount, categoryCount, tagCount, mediaCount, postCount, postImageCount, postTagCount] = await Promise.all([
    db.select({ count: sql<number>`count(*)` }).from(users),
    db.select({ count: sql<number>`count(*)` }).from(categories),
    db.select({ count: sql<number>`count(*)` }).from(tags),
    db.select({ count: sql<number>`count(*)` }).from(mediaAssets),
    db.select({ count: sql<number>`count(*)` }).from(posts),
    db.select({ count: sql<number>`count(*)` }).from(postImages),
    db.select({ count: sql<number>`count(*)` }).from(postTags),
  ]);

  console.log("Imported Supabase content into Turso:");
  console.log(`- users: ${userCount[0]?.count ?? 0}`);
  console.log(`- categories: ${categoryCount[0]?.count ?? 0}`);
  console.log(`- tags: ${tagCount[0]?.count ?? 0}`);
  console.log(`- media_assets: ${mediaCount[0]?.count ?? 0}`);
  console.log(`- posts: ${postCount[0]?.count ?? 0}`);
  console.log(`- post_images: ${postImageCount[0]?.count ?? 0}`);
  console.log(`- post_tags: ${postTagCount[0]?.count ?? 0}`);
}

void main();
