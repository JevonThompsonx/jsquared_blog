import { index, integer, primaryKey, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const series = sqliteTable("series", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description"),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
});

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  primaryEmail: text("primary_email").notNull(),
  role: text("role", { enum: ["reader", "author", "admin"] }).notNull().default("reader"),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
});

export const profiles = sqliteTable("profiles", {
  userId: text("user_id").primaryKey().references(() => users.id),
  displayName: text("display_name").notNull(),
  avatarUrl: text("avatar_url"),
  bio: text("bio"),
  themePreference: text("theme_preference"),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
});

export const authAccounts = sqliteTable("auth_accounts", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id),
  provider: text("provider", { enum: ["supabase", "github"] }).notNull(),
  providerUserId: text("provider_user_id").notNull(),
  providerEmail: text("provider_email"),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
});

export const categories = sqliteTable("categories", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description"),
});

export const mediaAssets = sqliteTable("media_assets", {
  id: text("id").primaryKey(),
  ownerUserId: text("owner_user_id").notNull().references(() => users.id),
  provider: text("provider", { enum: ["cloudinary", "supabase"] }).notNull(),
  publicId: text("public_id").notNull(),
  secureUrl: text("secure_url").notNull(),
  resourceType: text("resource_type", { enum: ["image", "video"] }).notNull().default("image"),
  format: text("format"),
  width: integer("width"),
  height: integer("height"),
  bytes: integer("bytes"),
  altText: text("alt_text"),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
});

export const posts = sqliteTable(
  "posts",
  {
    id: text("id").primaryKey(),
    title: text("title").notNull(),
    slug: text("slug").notNull().unique(),
    contentJson: text("content_json").notNull(),
    excerpt: text("excerpt"),
    status: text("status", { enum: ["draft", "published", "scheduled"] }).notNull().default("draft"),
    layoutType: text("layout_type", { enum: ["standard", "split-horizontal", "split-vertical", "hover"] }).default("standard"),
    publishedAt: integer("published_at", { mode: "timestamp_ms" }),
    scheduledPublishTime: integer("scheduled_publish_time", { mode: "timestamp_ms" }),
    authorId: text("author_id").notNull().references(() => users.id),
    categoryId: text("category_id").references(() => categories.id),
    seriesId: text("series_id").references(() => series.id),
    seriesOrder: integer("series_order"),
    featuredImageId: text("featured_image_id").references(() => mediaAssets.id),
    externalGalleryUrl: text("external_gallery_url"),
    externalGalleryLabel: text("external_gallery_label"),
    locationName: text("location_name"),
    locationLat: real("location_lat"),
    locationLng: real("location_lng"),
    locationZoom: integer("location_zoom"),
    iovanderUrl: text("ioverlander_url"),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
  },
  (table) => ({
    slugIndex: index("posts_slug_idx").on(table.slug),
    statusIndex: index("posts_status_idx").on(table.status),
    publishedAtIndex: index("posts_published_at_idx").on(table.publishedAt),
    authorIndex: index("posts_author_id_idx").on(table.authorId),
    seriesIndex: index("posts_series_id_idx").on(table.seriesId),
  }),
);

export const postImages = sqliteTable("post_images", {
  id: text("id").primaryKey(),
  postId: text("post_id").notNull().references(() => posts.id),
  mediaAssetId: text("media_asset_id").notNull().references(() => mediaAssets.id),
  sortOrder: integer("sort_order").notNull().default(0),
  focalX: integer("focal_x"),
  focalY: integer("focal_y"),
  caption: text("caption"),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
});

export const tags = sqliteTable("tags", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description"),
});

export const postTags = sqliteTable(
  "post_tags",
  {
    postId: text("post_id").notNull().references(() => posts.id),
    tagId: text("tag_id").notNull().references(() => tags.id),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.postId, table.tagId] }),
  }),
);

export const comments = sqliteTable("comments", {
  id: text("id").primaryKey(),
  postId: text("post_id").notNull().references(() => posts.id),
  authorId: text("author_id").notNull().references(() => users.id),
  content: text("content").notNull(),
  parentId: text("parent_id"),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
});

export const commentLikes = sqliteTable(
  "comment_likes",
  {
    commentId: text("comment_id").notNull().references(() => comments.id),
    userId: text("user_id").notNull().references(() => users.id),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.commentId, table.userId] }),
  }),
);

export const postBookmarks = sqliteTable(
  "post_bookmarks",
  {
    postId: text("post_id").notNull().references(() => posts.id),
    userId: text("user_id").notNull().references(() => users.id),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.postId, table.userId] }),
    userIdx: index("post_bookmarks_user_id_idx").on(table.userId),
  }),
);
