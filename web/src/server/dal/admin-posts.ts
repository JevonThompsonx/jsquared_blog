import "server-only";

import { and, asc, desc, eq, like, or, sql } from "drizzle-orm";
import { z } from "zod";

import { categories, mediaAssets, postImages, postTags, posts, series, tags } from "@/drizzle/schema";
import { getDb } from "@/lib/db";
import { getPostColumnCapabilities } from "@/server/dal/post-column-capabilities";
import { hasPostViewCountColumn } from "@/server/dal/posts";
import { listLinksForPost } from "@/server/dal/post-links";

const adminPostStatusSchema = z.enum(["draft", "published", "scheduled"]);
const adminPostSortSchema = z.enum(["updated-desc", "created-desc", "created-asc", "published-desc", "title-asc", "views-desc"]);

export const adminPostListFiltersSchema = z.object({
  query: z.string().trim().max(120).optional().default(""),
  category: z.string().trim().max(120).optional(),
  status: adminPostStatusSchema.optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(24),
  sort: adminPostSortSchema.optional().default("updated-desc"),
});

export type AdminPostListFilters = z.infer<typeof adminPostListFiltersSchema>;

export type AdminPostRecord = {
  id: string;
  slug: string;
  title: string;
  status: "draft" | "published" | "scheduled";
  excerpt: string | null;
  category: string | null;
  imageUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
  publishedAt: Date | null;
  scheduledPublishTime: Date | null;
  viewCount: number;
};

export type AdminEditablePostRecord = AdminPostRecord & {
  categoryId: string | null;
  layoutType: "standard" | "split-horizontal" | "split-vertical" | "hover" | null;
  contentJson: string;
  contentFormat: "tiptap-json" | "legacy-html";
  contentHtml: string | null;
  contentPlainText: string | null;
  featuredImageAlt: string | null;
  seriesId: string | null;
  seriesTitle: string | null;
  seriesOrder: number | null;
  locationName: string | null;
  locationLat: number | null;
  locationLng: number | null;
  locationZoom: number | null;
  iovanderUrl: string | null;
  songTitle: string | null;
  songArtist: string | null;
  songUrl: string | null;
  tags: Array<{ id: string; name: string; slug: string }>;
  galleryImages: Array<{
    id: string;
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
  links: Array<{ id: string; label: string; url: string; sortOrder: number }>;
};

export type AdminCategoryRecord = {
  id: string;
  name: string;
  slug: string;
};

export type AdminPostCounts = {
  total: number;
  published: number;
  draft: number;
  scheduled: number;
};

export type AdminPostListResult = {
  posts: AdminPostRecord[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
  filters: AdminPostListFilters;
};

function buildAdminPostWhere(filters: AdminPostListFilters) {
  const clauses = [];

  if (filters.status) {
    clauses.push(eq(posts.status, filters.status));
  }

  if (filters.category) {
    clauses.push(or(eq(categories.slug, filters.category), eq(categories.name, filters.category)));
  }

  if (filters.query) {
    const pattern = `%${filters.query.replace(/[%_]/g, "")}%`;
    clauses.push(
      or(
        like(posts.title, pattern),
        like(posts.slug, pattern),
        like(posts.excerpt, pattern),
        like(categories.name, pattern),
      ),
    );
  }

  if (clauses.length === 0) {
    return undefined;
  }

  return and(...clauses);
}

function getAdminViewCountSelection(hasViewCount: boolean) {
  return hasViewCount ? posts.viewCount : sql<number>`0`;
}

function getAdminPostOrder(sort: AdminPostListFilters["sort"], hasViewCount: boolean) {
  switch (sort) {
    case "created-desc":
      return [desc(posts.createdAt), desc(posts.updatedAt)];
    case "created-asc":
      return [asc(posts.createdAt), asc(posts.updatedAt)];
    case "published-desc":
      return [desc(posts.publishedAt), desc(posts.updatedAt)];
    case "title-asc":
      return [asc(posts.title), desc(posts.updatedAt)];
    case "views-desc":
      return hasViewCount ? [desc(posts.viewCount), desc(posts.updatedAt)] : [desc(posts.updatedAt), desc(posts.createdAt)];
    case "updated-desc":
    default:
      return [desc(posts.updatedAt), desc(posts.createdAt)];
  }
}

export async function listAdminPostRecords(rawFilters?: Partial<AdminPostListFilters>): Promise<AdminPostListResult> {
  const filters = adminPostListFiltersSchema.parse(rawFilters ?? {});
  const db = getDb();
  const hasViewCount = await hasPostViewCountColumn();
  const where = buildAdminPostWhere(filters);
  const offset = (filters.page - 1) * filters.pageSize;

  const [rows, countRows] = await Promise.all([
    db
      .select({
        id: posts.id,
        slug: posts.slug,
        title: posts.title,
        status: posts.status,
        excerpt: posts.excerpt,
        category: categories.name,
        imageUrl: mediaAssets.secureUrl,
        createdAt: posts.createdAt,
        updatedAt: posts.updatedAt,
        publishedAt: posts.publishedAt,
        scheduledPublishTime: posts.scheduledPublishTime,
        viewCount: getAdminViewCountSelection(hasViewCount),
      })
      .from(posts)
      .leftJoin(categories, eq(posts.categoryId, categories.id))
      .leftJoin(mediaAssets, eq(posts.featuredImageId, mediaAssets.id))
      .where(where)
      .orderBy(...getAdminPostOrder(filters.sort, hasViewCount))
      .offset(offset)
      .limit(filters.pageSize),
    db
      .select({ total: sql<number>`count(*)` })
      .from(posts)
      .leftJoin(categories, eq(posts.categoryId, categories.id))
      .where(where),
  ]);

  const totalCount = Number(countRows[0]?.total ?? 0);
  const totalPages = Math.max(1, Math.ceil(totalCount / filters.pageSize));

  return {
    posts: rows,
    totalCount,
    page: filters.page,
    pageSize: filters.pageSize,
    totalPages,
    filters,
  };
}

export async function getAdminPostCounts(): Promise<AdminPostCounts> {
  const db = getDb();

  const [countsRow] = await db
    .select({
      total: sql<number>`count(*)`,
      published: sql<number>`sum(case when ${posts.status} = 'published' then 1 else 0 end)`,
      draft: sql<number>`sum(case when ${posts.status} = 'draft' then 1 else 0 end)`,
      scheduled: sql<number>`sum(case when ${posts.status} = 'scheduled' then 1 else 0 end)`,
    })
    .from(posts);

  return {
    total: Number(countsRow?.total ?? 0),
    published: Number(countsRow?.published ?? 0),
    draft: Number(countsRow?.draft ?? 0),
    scheduled: Number(countsRow?.scheduled ?? 0),
  };
}

export async function getAdminEditablePostById(postId: string): Promise<AdminEditablePostRecord | null> {
  const db = getDb();
  const caps = await getPostColumnCapabilities();
  const rows = await db
    .select({
      id: posts.id,
      slug: posts.slug,
      title: posts.title,
      status: posts.status,
      excerpt: posts.excerpt,
      category: categories.name,
      categoryId: posts.categoryId,
      imageUrl: mediaAssets.secureUrl,
      featuredImageAlt: mediaAssets.altText,
      createdAt: posts.createdAt,
      updatedAt: posts.updatedAt,
      publishedAt: posts.publishedAt,
      scheduledPublishTime: posts.scheduledPublishTime,
      viewCount: getAdminViewCountSelection(caps.viewCount),
      layoutType: caps.layoutType ? posts.layoutType : sql<null>`null`,
      contentJson: posts.contentJson,
      contentFormat: posts.contentFormat,
      contentHtml: posts.contentHtml,
      contentPlainText: posts.contentPlainText,
      seriesId: posts.seriesId,
      seriesTitle: series.title,
      seriesOrder: posts.seriesOrder,
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
    .leftJoin(categories, eq(posts.categoryId, categories.id))
    .leftJoin(mediaAssets, eq(posts.featuredImageId, mediaAssets.id))
    .leftJoin(series, eq(posts.seriesId, series.id))
    .where(eq(posts.id, postId))
    .limit(1);

  const post = rows[0];
  if (!post) {
    return null;
  }

  const [postTagRows, galleryRows, linkRows] = await Promise.all([
    db
      .select({ id: tags.id, name: tags.name, slug: tags.slug })
      .from(postTags)
      .innerJoin(tags, eq(postTags.tagId, tags.id))
      .where(eq(postTags.postId, postId)),
    db
      .select({
        id: postImages.id,
        imageUrl: mediaAssets.secureUrl,
        altText: mediaAssets.altText,
        sortOrder: postImages.sortOrder,
        focalX: postImages.focalX,
        focalY: postImages.focalY,
        exifTakenAt: mediaAssets.exifTakenAt,
        exifLat: mediaAssets.exifLat,
        exifLng: mediaAssets.exifLng,
        exifCameraMake: mediaAssets.exifCameraMake,
        exifCameraModel: mediaAssets.exifCameraModel,
        exifLensModel: mediaAssets.exifLensModel,
        exifAperture: mediaAssets.exifAperture,
        exifShutterSpeed: mediaAssets.exifShutterSpeed,
        exifIso: mediaAssets.exifIso,
      })
      .from(postImages)
      .innerJoin(mediaAssets, eq(postImages.mediaAssetId, mediaAssets.id))
      .where(eq(postImages.postId, postId))
      .orderBy(postImages.sortOrder),
    listLinksForPost(postId),
  ]);

  return {
    ...post,
    featuredImageAlt: post.featuredImageAlt ?? null,
    contentFormat: post.contentFormat,
    contentHtml: post.contentHtml ?? null,
    contentPlainText: post.contentPlainText ?? null,
    seriesId: post.seriesId ?? null,
    seriesTitle: post.seriesTitle ?? null,
    seriesOrder: post.seriesOrder ?? null,
    locationName: post.locationName ?? null,
    locationLat: post.locationLat ?? null,
    locationLng: post.locationLng ?? null,
    locationZoom: post.locationZoom ?? null,
    iovanderUrl: post.iovanderUrl ?? null,
    songTitle: post.songTitle ?? null,
    songArtist: post.songArtist ?? null,
    songUrl: post.songUrl ?? null,
    tags: postTagRows,
    galleryImages: galleryRows,
    links: linkRows.map((l) => ({ id: l.id, label: l.label, url: l.url, sortOrder: l.sortOrder })),
  };
}

export async function listAdminCategories(): Promise<AdminCategoryRecord[]> {
  const db = getDb();
  return db.select({ id: categories.id, name: categories.name, slug: categories.slug }).from(categories).orderBy(categories.name);
}

export async function listAllAdminTags(): Promise<Array<{ id: string; name: string; slug: string }>> {
  const db = getDb();
  return db.select({ id: tags.id, name: tags.name, slug: tags.slug }).from(tags).orderBy(tags.name);
}
