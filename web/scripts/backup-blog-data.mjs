#!/usr/bin/env node
/**
 * Local continuity backup for the J² Adventures blog.
 *
 * - Dumps the whole Turso/libSQL schema + data to a SQL file that restores into
 *   plain SQLite (`sqlite3 restore.db < turso.sql`).
 * - Mirrors every public image URL referenced by the database/content into a
 *   content-addressed local folder.
 * - Writes a manifest with checksums so a restore can be verified.
 *
 * This is intentionally a backup/mirror, not a live data path. It runs from
 * `web/` and reads the repo-root `.env`; never commit that file.
 *
 * Usage: node scripts/backup-blog-data.mjs [outputDir] [--prune <days>]
 */
import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";

import { createClient } from "@libsql/client";
import dotenv from "dotenv";

const repoRoot = path.resolve(import.meta.dirname, "../..");
dotenv.config({ path: path.join(repoRoot, ".env"), quiet: true });
dotenv.config({ path: path.join(repoRoot, ".env.local"), quiet: true });

const databaseUrl = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

if (!databaseUrl || !authToken) {
  console.error("TURSO_DATABASE_URL and TURSO_AUTH_TOKEN are required.");
  process.exit(1);
}

const date = new Date().toISOString().slice(0, 10);
const outputArg =
  process.argv[2] && !process.argv[2].startsWith("--")
    ? process.argv[2]
    : undefined;
const outputDir = path.resolve(
  outputArg ?? path.join("/home/hermes/backups/jsquared_blog", date),
);
const imagesDir = path.join(outputDir, "images");
const sqlPath = path.join(outputDir, "turso.sql");
const manifestPath = path.join(outputDir, "manifest.json");

const db = createClient({ url: databaseUrl, authToken });
const manifest = {
  createdAt: new Date().toISOString(),
  tables: {},
  images: [],
};

function sqlLiteral(value) {
  if (value === null || value === undefined) return "NULL";
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new Error("Non-finite number in dump");
    return String(value);
  }
  if (typeof value === "bigint") return String(value);
  if (typeof value === "boolean") return value ? "1" : "0";
  if (value instanceof Uint8Array) {
    return `X'${Buffer.from(value).toString("hex")}'`;
  }
  if (value instanceof Date) return `'${value.toISOString()}'`;
  if (typeof value === "object") {
    return sqlLiteral(JSON.stringify(value));
  }
  return `'${String(value).replaceAll("'", "''")}'`;
}

function quoteIdentifier(value) {
  return `"${String(value).replaceAll('"', '""')}"`;
}

async function dumpDatabase() {
  const objects = await db.execute(
    "SELECT type, name, sql FROM sqlite_master WHERE sql IS NOT NULL AND name NOT LIKE 'sqlite_%' ORDER BY CASE type WHEN 'table' THEN 0 WHEN 'index' THEN 1 WHEN 'trigger' THEN 2 ELSE 3 END",
  );

  const lines = ["PRAGMA foreign_keys=OFF;", "BEGIN;"];

  for (const object of objects.rows) {
    lines.push(`${object.sql};`);
  }

  for (const object of objects.rows.filter((row) => row.type === "table")) {
    const table = String(object.name);
    const result = await db.execute(`SELECT * FROM ${quoteIdentifier(table)}`);
    const columns = result.columns;
    manifest.tables[table] = result.rows.length;

    for (const row of result.rows) {
      const values = columns.map((column) => sqlLiteral(row[column]));
      lines.push(
        `INSERT INTO ${quoteIdentifier(table)} (${columns.map(quoteIdentifier).join(", ")}) VALUES (${values.join(", ")});`,
      );
    }
  }

  lines.push("COMMIT;", "");
  await writeFile(sqlPath, lines.join("\n"), "utf8");
}

const IMAGE_HOSTS = [
  "res.cloudinary.com",
  "imagedelivery.net",
  "supabase.co",
  "images.unsplash.com",
  "placehold.co",
];
const IMAGE_URL_PATTERN = /https?:\/\/[^\s"'<>\\]+/g;

async function collectImageUrls() {
  const urls = new Map();
  const addFromText = (value, critical = true) => {
    if (typeof value !== "string") return;
    for (const match of value.matchAll(IMAGE_URL_PATTERN)) {
      const url = match[0].replace(/[),.;]+$/, "");
      if (IMAGE_HOSTS.some((host) => url.includes(host))) {
        urls.set(url, (urls.get(url) ?? false) || critical);
      }
    }
  };

  // Only mirror assets that are actually referenced by published content or
  // a public profile/wishlist entry. Media_assets also contains legacy rows
  // for dead storage providers; those must not fail the backup.
  const media = await db.execute(`
    SELECT ma.secure_url
    FROM media_assets ma
    WHERE EXISTS (SELECT 1 FROM posts p WHERE p.featured_image_id = ma.id)
       OR EXISTS (SELECT 1 FROM post_images pi WHERE pi.media_asset_id = ma.id)
  `);
  for (const row of media.rows) addFromText(row.secure_url);

  const posts = await db.execute(
    "SELECT content_html, content_json FROM posts WHERE status = 'published'",
  );
  for (const row of posts.rows) {
    addFromText(row.content_html);
    addFromText(row.content_json);
  }

  const profiles = await db.execute("SELECT avatar_url FROM profiles");
  for (const row of profiles.rows) addFromText(row.avatar_url, false);

  try {
    const wishlist = await db.execute("SELECT image_url FROM wishlist_places");
    for (const row of wishlist.rows) addFromText(row.image_url, false);
  } catch {
    // Older schemas may not have image_url.
  }

  return [...urls.entries()];
}

async function mirrorImages() {
  await mkdir(imagesDir, { recursive: true });
  const urls = await collectImageUrls();

  for (const [url, critical] of urls) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 20_000);
      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timeout);
      if (!response.ok) {
        manifest.images.push({
          url,
          critical,
          error: `HTTP ${response.status}`,
        });
        continue;
      }

      const bytes = new Uint8Array(await response.arrayBuffer());
      const hash = createHash("sha256").update(bytes).digest("hex");
      const extension = response.headers.get("content-type")?.includes("png")
        ? "png"
        : response.headers.get("content-type")?.includes("webp")
          ? "webp"
          : response.headers.get("content-type")?.includes("gif")
            ? "gif"
            : "jpg";
      const filename = `${hash}.${extension}`;
      await writeFile(path.join(imagesDir, filename), bytes);
      manifest.images.push({
        url,
        file: filename,
        bytes: bytes.byteLength,
        sha256: hash,
      });
    } catch (error) {
      manifest.images.push({
        url,
        critical,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
}

async function pruneOldBackups() {
  const index = process.argv.indexOf("--prune");
  const days = index === -1 ? 0 : Number(process.argv[index + 1]);
  if (!Number.isFinite(days) || days <= 0) return;

  const root = path.dirname(outputDir);
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  for (const entry of await readdir(root, { withFileTypes: true })) {
    if (!entry.isDirectory() || entry.name === path.basename(outputDir))
      continue;
    const full = path.join(root, entry.name);
    const stamp = entry.name.match(/^\d{4}-\d{2}-\d{2}$/);
    if (!stamp) continue;
    if (Date.parse(entry.name) < cutoff)
      await rm(full, { recursive: true, force: true });
  }
}

await mkdir(outputDir, { recursive: true });
await dumpDatabase();
await mirrorImages();
await pruneOldBackups();
manifest.files = {
  sql: {
    path: "turso.sql",
    sha256: createHash("sha256")
      .update(await readFile(sqlPath))
      .digest("hex"),
  },
};
await writeFile(manifestPath, JSON.stringify(manifest, null, 2), "utf8");

const imageFailures = manifest.images.filter((image) => image.error);
console.log(
  `backup complete: ${outputDir} (${Object.values(manifest.tables).reduce((sum, count) => sum + count, 0)} rows, ${manifest.images.filter((image) => image.file).length}/${manifest.images.length} images)`,
);
if (imageFailures.length > 0) {
  const criticalFailures = imageFailures.filter((image) => image.critical);
  console.error(
    `image mirror failures: ${imageFailures.length} (${criticalFailures.length} critical)`,
  );
  for (const failure of imageFailures.slice(0, 5)) {
    console.error(
      `  ${failure.critical ? "CRITICAL " : ""}${failure.url}: ${failure.error}`,
    );
  }
  if (criticalFailures.length > 0) process.exitCode = 1;
}
