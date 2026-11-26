#!/usr/bin/env node
/**
 * One-off: rewrite the local SQLite copy from cloud image URLs to /media files.
 *
 * Usage:
 *   node scripts/migrate-local-media.mjs <dbPath> <mediaRoot>
 *
 * - Downloads every Cloudinary URL referenced by media_assets or post content.
 * - Re-encodes to WebP with sharp (drops EXIF/IPTC/XMP).
 * - Rewrites media_assets, posts.content_html/content_json, post_revisions,
 *   profiles.avatar_url and wishlist_places.image_url.
 * - Deletes orphan media_assets rows for dead providers.
 */
import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { createClient } from "@libsql/client";
import sharp from "sharp";

const dbPath = process.argv[2];
const mediaRoot = path.resolve(process.argv[3] ?? "local/media");

if (!dbPath) {
  console.error(
    "Usage: node scripts/migrate-local-media.mjs <dbPath> <mediaRoot>",
  );
  process.exit(1);
}

const db = createClient({ url: `file:${dbPath}` });
const IMAGE_HOSTS = new Set([
  "res.cloudinary.com",
  "imagedelivery.net",
  "images.unsplash.com",
]);

function isImageHost(hostname) {
  return IMAGE_HOSTS.has(hostname) || hostname.endsWith(".supabase.co");
}
const URL_PATTERN = /https?:\/\/[^\s"'<>\\]+/g;
const mapped = new Map();

function slug(value) {
  return (
    value
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[^a-z0-9\s-]/g, "")
      .trim()
      .replace(/\s+/g, "-")
      .slice(0, 60) || "image"
  );
}

async function storeUrl(url) {
  if (mapped.has(url)) return mapped.get(url);

  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(20_000) });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const bytes = Buffer.from(await response.arrayBuffer());
    const image = sharp(bytes, { failOn: "error" }).rotate();
    const { data: webp, info } = await image
      .webp({ quality: 82, effort: 4 })
      .toBuffer({ resolveWithObject: true });
    const hash = createHash("sha256").update(webp).digest("hex").slice(0, 16);
    const now = new Date();
    const relative = [
      String(now.getUTCFullYear()),
      String(now.getUTCMonth() + 1).padStart(2, "0"),
      `${hash}-${slug(decodeURIComponent(new URL(url).pathname.split("/").pop() ?? "image").replace(/\.[^.]+$/, ""))}.webp`,
    ].join("/");
    const absolute = path.join(mediaRoot, relative);
    await mkdir(path.dirname(absolute), { recursive: true });
    await writeFile(absolute, webp);

    const result = {
      url: `/media/${relative}`,
      publicId: relative,
      format: "webp",
      width: info.width ?? null,
      height: info.height ?? null,
      bytes: webp.byteLength,
    };
    mapped.set(url, result);
    return result;
  } catch (error) {
    console.warn(
      `skip ${url.split("/").slice(0, 4).join("/")}: ${error.message}`,
    );
    mapped.set(url, null);
    return null;
  }
}

async function collectUrls() {
  const urls = new Set();
  const add = (value) => {
    if (typeof value !== "string") return;
    for (const match of value.matchAll(URL_PATTERN)) {
      const url = match[0].replace(/[),.;]+$/, "");
      try {
        if (isImageHost(new URL(url).hostname)) urls.add(url);
      } catch {
        // Not an absolute URL; ignore.
      }
    }
  };

  for (const row of (await db.execute("select secure_url from media_assets"))
    .rows)
    add(row.secure_url);
  for (const row of (
    await db.execute("select content_html, content_json from posts")
  ).rows) {
    add(row.content_html);
    add(row.content_json);
  }
  for (const row of (
    await db.execute("select content_json from post_revisions")
  ).rows)
    add(row.content_json);
  for (const row of (await db.execute("select avatar_url from profiles")).rows)
    add(row.avatar_url);
  for (const row of (await db.execute("select image_url from wishlist_places"))
    .rows)
    add(row.image_url);

  return [...urls];
}

async function rewriteText(value) {
  if (typeof value !== "string") return value;
  let output = value;
  for (const [url, replacement] of mapped) {
    if (!replacement) continue;
    output = output.split(url).join(replacement.url);
  }
  return output;
}

const urls = await collectUrls();
const apply = process.argv.includes("--apply");
console.log(`found ${urls.length} remote image URLs`);

if (!apply) {
  for (const url of urls) console.log(`  would migrate ${url}`);
  console.log("dry run: re-run with --apply to download, rewrite, and prune");
  process.exit(0);
}

for (const url of urls) {
  await storeUrl(url);
}

const mediaRows = (
  await db.execute("select id, provider, secure_url from media_assets")
).rows;
for (const row of mediaRows) {
  const replacement = mapped.get(row.secure_url);
  if (replacement) {
    await db.execute(
      "update media_assets set provider = 'local', public_id = ?, secure_url = ?, format = ?, width = ?, height = ?, bytes = ?, exif_lat = null, exif_lng = null where id = ?",
      [
        replacement.publicId,
        replacement.url,
        replacement.format,
        replacement.width,
        replacement.height,
        replacement.bytes,
        row.id,
      ],
    );
  }
}

for (const row of (
  await db.execute("select id, content_html, content_json from posts")
).rows) {
  await db.execute(
    "update posts set content_html = ?, content_json = ? where id = ?",
    [
      await rewriteText(row.content_html),
      await rewriteText(row.content_json),
      row.id,
    ],
  );
}
for (const row of (
  await db.execute("select id, content_json from post_revisions")
).rows) {
  await db.execute("update post_revisions set content_json = ? where id = ?", [
    await rewriteText(row.content_json),
    row.id,
  ]);
}
for (const row of (
  await db.execute(
    "select user_id, avatar_url from profiles where avatar_url is not null",
  )
).rows) {
  const replacement = mapped.get(row.avatar_url);
  if (replacement) {
    await db.execute("update profiles set avatar_url = ? where user_id = ?", [
      replacement.url,
      row.user_id,
    ]);
  } else if (
    row.avatar_url.includes("supabase.co") ||
    row.avatar_url.includes("imagedelivery.net")
  ) {
    await db.execute(
      "update profiles set avatar_url = null where user_id = ?",
      [row.user_id],
    );
  }
}
for (const row of (
  await db.execute(
    "select id, image_url from wishlist_places where image_url is not null",
  )
).rows) {
  const replacement = mapped.get(row.image_url);
  if (replacement) {
    await db.execute("update wishlist_places set image_url = ? where id = ?", [
      replacement.url,
      row.id,
    ]);
  }
}

// Remove orphan media rows for dead providers; published content no longer uses them.
const referenced = new Set();
for (const row of (
  await db.execute(
    "select featured_image_id as id from posts where featured_image_id is not null",
  )
).rows)
  referenced.add(row.id);
for (const row of (
  await db.execute("select media_asset_id as id from post_images")
).rows)
  referenced.add(row.id);
for (const row of (
  await db.execute("select id, provider, secure_url from media_assets")
).rows) {
  if (row.provider !== "local" && !referenced.has(row.id)) {
    await db.execute("delete from media_assets where id = ?", [row.id]);
  }
}

const legacyChecks = [
  ["posts", "content_html"],
  ["posts", "content_json"],
  ["post_revisions", "content_json"],
  ["media_assets", "secure_url"],
  ["profiles", "avatar_url"],
  ["wishlist_places", "image_url"],
];
let legacy = 0;
for (const [table, column] of legacyChecks) {
  const rows = await db.execute(
    `select count(*) as n from ${table} where ${column} like '%res.cloudinary.com%' or ${column} like '%supabase.co%' or ${column} like '%imagedelivery.net%' or ${column} like '%images.unsplash.com%'`,
  );
  const count = Number(rows.rows[0]?.n ?? 0);
  if (count)
    console.error(`legacy URLs remain in ${table}.${column}: ${count}`);
  legacy += count;
}

console.log(
  `mapped ${[...mapped.values()].filter(Boolean).length}/${urls.length} images; legacy remaining ${legacy}`,
);
if (legacy > 0) process.exitCode = 1;
