import { createClient as createLibsqlClient } from "@libsql/client";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

type SyncBindings = {
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
  TURSO_DATABASE_URL?: string;
  TURSO_AUTH_TOKEN?: string;
};

type SupabasePost = {
  id: number;
  title: string;
  description: string | null;
  image_url: string | null;
  category: string | null;
  author_id: string | null;
  type: "split-horizontal" | "split-vertical" | "hover" | null;
  status: "draft" | "published" | "scheduled";
  scheduled_for: string | null;
  published_at: string | null;
  created_at: string;
};

type SupabaseProfile = {
  id: string;
  username: string | null;
  avatar_url: string | null;
  role: string | null;
  theme_preference: string | null;
};

type SupabaseTag = {
  id: number;
  name: string;
  slug: string;
};

type SupabasePostImage = {
  id: number;
  post_id: number;
  image_url: string;
  sort_order: number;
  focal_point?: string | null;
  alt_text?: string | null;
  created_at: string;
};

const UNKNOWN_AUTHOR_SOURCE_ID = "unknown";

function hasTursoConfig(env: SyncBindings): env is SyncBindings & { TURSO_DATABASE_URL: string; TURSO_AUTH_TOKEN: string } {
  return Boolean(env.TURSO_DATABASE_URL && env.TURSO_AUTH_TOKEN);
}

function createTursoClient(env: SyncBindings) {
  if (!hasTursoConfig(env)) {
    return null;
  }

  return createLibsqlClient({
    url: env.TURSO_DATABASE_URL,
    authToken: env.TURSO_AUTH_TOKEN,
  });
}

function createAdminSupabase(env: SyncBindings) {
  const key = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_ANON_KEY;
  return createSupabaseClient(env.SUPABASE_URL, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function htmlToPlainText(html: string | null): string {
  if (!html) {
    return "";
  }

  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function sanitizeHtml(html: string | null): string {
  return html ?? "<p>This story is still being migrated.</p>";
}

function buildLegacyContentJson(description: string | null): string {
  return JSON.stringify({
    type: "legacy-html",
    html: sanitizeHtml(description),
  });
}

function toTimestamp(value: string | null | undefined): number {
  if (!value) {
    return Date.now();
  }

  const parsed = new Date(value).getTime();
  return Number.isNaN(parsed) ? Date.now() : parsed;
}

function toNullableTimestamp(value: string | null | undefined): number | null {
  if (!value) {
    return null;
  }

  const parsed = new Date(value).getTime();
  return Number.isNaN(parsed) ? null : parsed;
}

function toLegacyUserId(profileId: string): string {
  return `legacy-user-${profileId}`;
}

function toLegacyAuthAccountId(profileId: string): string {
  return `legacy-auth-supabase-${profileId}`;
}

function toUnknownLegacyUserId(): string {
  return toLegacyUserId(UNKNOWN_AUTHOR_SOURCE_ID);
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

function toLegacyTagId(tagId: number): string {
  return `legacy-tag-${tagId}`;
}

function toLegacyMediaId(source: "featured" | "gallery", postId: number, imageId?: number): string {
  return source === "featured"
    ? `legacy-media-featured-${postId}`
    : `legacy-media-gallery-${imageId ?? postId}`;
}

function toLegacyPostImageId(imageId: number): string {
  return `legacy-post-image-${imageId}`;
}

function mapUserRole(role: string | null): "reader" | "author" | "admin" {
  if (role === "admin") {
    return "admin";
  }

  return "author";
}

function mapLegacyLayoutType(value: SupabasePost["type"]): "standard" | "split-horizontal" | "split-vertical" | "hover" {
  if (value === "split-horizontal" || value === "split-vertical" || value === "hover") {
    return value;
  }

  return "standard";
}

function extractPublicId(imageUrl: string): string {
  try {
    const parsed = new URL(imageUrl);
    return `${parsed.hostname}${parsed.pathname}`;
  } catch {
    return imageUrl.replace(/^https?:\/\//, "");
  }
}

function extractFormat(imageUrl: string): string | null {
  try {
    const parsed = new URL(imageUrl);
    const lastSegment = parsed.pathname.split("/").filter(Boolean).pop() ?? "";
    const extension = lastSegment.includes(".") ? lastSegment.split(".").pop() ?? null : null;
    return extension;
  } catch {
    return null;
  }
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

async function ensureUser(client: NonNullable<ReturnType<typeof createTursoClient>>, profile: SupabaseProfile | null, authorId: string | null) {
  const sourceId = profile?.id ?? authorId ?? UNKNOWN_AUTHOR_SOURCE_ID;
  const userId = toLegacyUserId(sourceId);
  const displayName = profile?.username ?? (authorId ? `legacy-${authorId.slice(0, 8)}` : "legacy-import");
  const now = Date.now();

  await client.execute({
    sql: `
      INSERT INTO users (id, primary_email, role, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        primary_email = excluded.primary_email,
        role = excluded.role,
        updated_at = excluded.updated_at
    `,
    args: [userId, `${displayName}@legacy.supabase.local`, mapUserRole(profile?.role ?? "author"), now, now],
  });

  await client.execute({
    sql: `
      INSERT INTO profiles (user_id, display_name, avatar_url, bio, theme_preference, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(user_id) DO UPDATE SET
        display_name = excluded.display_name,
        avatar_url = excluded.avatar_url,
        bio = excluded.bio,
        theme_preference = excluded.theme_preference,
        updated_at = excluded.updated_at
    `,
    args: [userId, displayName, profile?.avatar_url ?? null, null, profile?.theme_preference ?? null, now, now],
  });

  await client.execute({
    sql: `
      INSERT INTO auth_accounts (id, user_id, provider, provider_user_id, provider_email, created_at)
      VALUES (?, ?, 'supabase', ?, NULL, ?)
      ON CONFLICT(id) DO UPDATE SET
        user_id = excluded.user_id,
        provider_user_id = excluded.provider_user_id
    `,
    args: [toLegacyAuthAccountId(sourceId), userId, sourceId, now],
  });

  return userId;
}

async function ensureCategory(client: NonNullable<ReturnType<typeof createTursoClient>>, categoryName: string | null) {
  if (!categoryName) {
    return null;
  }

  const categoryId = toCategoryId(categoryName);
  await client.execute({
    sql: `
      INSERT INTO categories (id, name, slug, description)
      VALUES (?, ?, ?, NULL)
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name,
        slug = excluded.slug
    `,
    args: [categoryId, categoryName, slugify(categoryName)],
  });

  return categoryId;
}

async function upsertTag(client: NonNullable<ReturnType<typeof createTursoClient>>, tag: SupabaseTag) {
  const tagId = toLegacyTagId(tag.id);
  await client.execute({
    sql: `
      INSERT INTO tags (id, name, slug)
      VALUES (?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name,
        slug = excluded.slug
    `,
    args: [tagId, tag.name, tag.slug],
  });
  return tagId;
}

async function upsertMediaAsset(
  client: NonNullable<ReturnType<typeof createTursoClient>>,
  mediaId: string,
  ownerUserId: string,
  imageUrl: string,
  altText: string | null,
  createdAt: number,
) {
  await client.execute({
    sql: `
      INSERT INTO media_assets (id, owner_user_id, provider, public_id, secure_url, resource_type, format, width, height, bytes, alt_text, created_at)
      VALUES (?, ?, 'supabase', ?, ?, 'image', ?, NULL, NULL, NULL, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        owner_user_id = excluded.owner_user_id,
        public_id = excluded.public_id,
        secure_url = excluded.secure_url,
        format = excluded.format,
        alt_text = excluded.alt_text
    `,
    args: [mediaId, ownerUserId, extractPublicId(imageUrl), imageUrl, extractFormat(imageUrl), altText, createdAt],
  });
}

async function getSupabaseProfile(supabase: ReturnType<typeof createAdminSupabase>, userId: string | null) {
  if (!userId) {
    return null;
  }

  const { data } = await supabase
    .from("profiles")
    .select("id, username, avatar_url, role, theme_preference")
    .eq("id", userId)
    .single();

  return (data ?? null) as SupabaseProfile | null;
}

async function getSupabasePostTags(supabase: ReturnType<typeof createAdminSupabase>, postId: number) {
  const { data } = await supabase
    .from("post_tags")
    .select("tags(id, name, slug)")
    .eq("post_id", postId);

  return ((data ?? [])
    .flatMap((row) => {
      const tagValue = (row as { tags?: unknown }).tags;
      return Array.isArray(tagValue) ? tagValue : tagValue ? [tagValue] : [];
    })
    .filter(Boolean) as unknown as SupabaseTag[]);
}

async function getSupabasePostImages(supabase: ReturnType<typeof createAdminSupabase>, postId: number) {
  const { data } = await supabase
    .from("post_images")
    .select("id, post_id, image_url, sort_order, focal_point, alt_text, created_at")
    .eq("post_id", postId)
    .order("sort_order", { ascending: true });

  return (data ?? []) as SupabasePostImage[];
}

export async function syncTagBySlug(env: SyncBindings, slug: string) {
  const client = createTursoClient(env);
  if (!client) {
    return;
  }

  const supabase = createAdminSupabase(env);
  const { data: tag } = await supabase
    .from("tags")
    .select("id, name, slug")
    .eq("slug", slug)
    .single();

  if (!tag) {
    return;
  }

  await upsertTag(client, tag as SupabaseTag);
}

export async function syncPostFromSupabase(env: SyncBindings, postId: number) {
  const client = createTursoClient(env);
  if (!client) {
    return;
  }

  const supabase = createAdminSupabase(env);
  const { data: post } = await supabase
    .from("posts")
    .select("id, title, description, image_url, category, author_id, type, status, scheduled_for, published_at, created_at")
    .eq("id", postId)
    .single();

  if (!post) {
    await deletePostFromTurso(env, postId);
    return;
  }

  const postRecord = post as SupabasePost;
  const [profile, postTags, galleryImages] = await Promise.all([
    getSupabaseProfile(supabase, postRecord.author_id),
    getSupabasePostTags(supabase, postId),
    getSupabasePostImages(supabase, postId),
  ]);

  const authorId = await ensureUser(client, profile, postRecord.author_id);
  const categoryId = await ensureCategory(client, postRecord.category);
  const featuredMediaId = postRecord.image_url ? toLegacyMediaId("featured", postRecord.id) : null;

  if (postRecord.image_url && featuredMediaId) {
    await upsertMediaAsset(
      client,
      featuredMediaId,
      authorId,
      postRecord.image_url,
      postRecord.title,
      toTimestamp(postRecord.created_at),
    );
  } else if (featuredMediaId) {
    await client.execute({ sql: "DELETE FROM media_assets WHERE id = ?", args: [featuredMediaId] });
  }

  await client.execute({
    sql: `
      INSERT INTO posts (
        id, title, slug, content_json, excerpt, status, layout_type, published_at,
        scheduled_publish_time, author_id, category_id, featured_image_id,
        external_gallery_url, external_gallery_label, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, NULL, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        title = excluded.title,
        slug = excluded.slug,
        content_json = excluded.content_json,
        excerpt = excluded.excerpt,
        status = excluded.status,
        layout_type = excluded.layout_type,
        published_at = excluded.published_at,
        scheduled_publish_time = excluded.scheduled_publish_time,
        author_id = excluded.author_id,
        category_id = excluded.category_id,
        featured_image_id = excluded.featured_image_id,
        updated_at = excluded.updated_at
    `,
    args: [
      toLegacyPostId(postRecord.id),
      postRecord.title,
      toLegacyPostSlug(postRecord),
      buildLegacyContentJson(postRecord.description),
      htmlToPlainText(postRecord.description).slice(0, 280) || null,
      postRecord.status,
      mapLegacyLayoutType(postRecord.type),
      toNullableTimestamp(postRecord.published_at),
      toNullableTimestamp(postRecord.scheduled_for),
      authorId,
      categoryId,
      featuredMediaId,
      toTimestamp(postRecord.created_at),
      toNullableTimestamp(postRecord.published_at) ?? toTimestamp(postRecord.created_at),
    ],
  });

  await client.execute({ sql: "DELETE FROM post_tags WHERE post_id = ?", args: [toLegacyPostId(postRecord.id)] });
  for (const tag of postTags) {
    const tagId = await upsertTag(client, tag);
    await client.execute({
      sql: "INSERT OR IGNORE INTO post_tags (post_id, tag_id) VALUES (?, ?)",
      args: [toLegacyPostId(postRecord.id), tagId],
    });
  }

  const existingGalleryRows = await client.execute({
    sql: "SELECT media_asset_id FROM post_images WHERE post_id = ?",
    args: [toLegacyPostId(postRecord.id)],
  });
  await client.execute({ sql: "DELETE FROM post_images WHERE post_id = ?", args: [toLegacyPostId(postRecord.id)] });
  for (const row of existingGalleryRows.rows) {
    const mediaAssetId = row.media_asset_id as string | undefined;
    if (mediaAssetId) {
      await client.execute({ sql: "DELETE FROM media_assets WHERE id = ?", args: [mediaAssetId] });
    }
  }

  for (const image of galleryImages) {
    const mediaId = toLegacyMediaId("gallery", image.post_id, image.id);
    await upsertMediaAsset(
      client,
      mediaId,
      authorId,
      image.image_url,
      image.alt_text ?? null,
      toTimestamp(image.created_at),
    );
    const focal = parseFocalPoint(image.focal_point);
    await client.execute({
      sql: `
        INSERT INTO post_images (id, post_id, media_asset_id, sort_order, focal_x, focal_y, caption, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          media_asset_id = excluded.media_asset_id,
          sort_order = excluded.sort_order,
          focal_x = excluded.focal_x,
          focal_y = excluded.focal_y,
          caption = excluded.caption
      `,
      args: [
        toLegacyPostImageId(image.id),
        toLegacyPostId(postRecord.id),
        mediaId,
        image.sort_order,
        focal.focalX,
        focal.focalY,
        image.alt_text ?? null,
        toTimestamp(image.created_at),
      ],
    });
  }
}

export async function deletePostFromTurso(env: SyncBindings, postId: number) {
  const client = createTursoClient(env);
  if (!client) {
    return;
  }

  const tursoPostId = toLegacyPostId(postId);
  const galleryRows = await client.execute({
    sql: "SELECT media_asset_id FROM post_images WHERE post_id = ?",
    args: [tursoPostId],
  });

  await client.execute({ sql: "DELETE FROM post_tags WHERE post_id = ?", args: [tursoPostId] });
  await client.execute({ sql: "DELETE FROM post_images WHERE post_id = ?", args: [tursoPostId] });
  await client.execute({ sql: "DELETE FROM posts WHERE id = ?", args: [tursoPostId] });
  await client.execute({ sql: "DELETE FROM media_assets WHERE id = ?", args: [toLegacyMediaId("featured", postId)] });

  for (const row of galleryRows.rows) {
    const mediaAssetId = row.media_asset_id as string | undefined;
    if (mediaAssetId) {
      await client.execute({ sql: "DELETE FROM media_assets WHERE id = ?", args: [mediaAssetId] });
    }
  }
}
