/**
 * Storage Cleanup Script
 *
 * Finds and removes orphaned files from Supabase Storage that are
 * no longer referenced in the database.
 *
 * Usage: cd server && bun run src/cleanup-storage.ts
 */

import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || "";
const supabaseKey = process.env.SUPABASE_ANON_KEY || "";

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing SUPABASE_URL or SUPABASE_ANON_KEY in environment variables");
  console.error("Create a .env file in the server directory with these values.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
const BUCKET_NAME = "jsquared_blog";

async function cleanupStorage() {
  console.log("🧹 Starting storage cleanup...\n");

  // 1. List all files in the bucket
  console.log("📁 Fetching files from storage bucket...");
  const { data: storageFiles, error: listError } = await supabase.storage
    .from(BUCKET_NAME)
    .list("", { limit: 1000 });

  if (listError) {
    console.error("Failed to list storage files:", listError);
    process.exit(1);
  }

  // Also get files in avatars/ subfolder
  const { data: avatarFiles } = await supabase.storage
    .from(BUCKET_NAME)
    .list("avatars", { limit: 1000 });

  const allStorageFiles = [
    ...(storageFiles || []).filter(f => f.name !== "avatars").map(f => f.name),
    ...(avatarFiles || []).map(f => `avatars/${f.name}`),
  ];

  console.log(`   Found ${allStorageFiles.length} files in storage\n`);

  // 2. Get all referenced URLs from database
  console.log("🔍 Fetching referenced URLs from database...");

  // Post images
  const { data: postImages } = await supabase
    .from("post_images")
    .select("image_url");

  // Post cover images (legacy)
  const { data: posts } = await supabase
    .from("posts")
    .select("image_url");

  // Profile avatars
  const { data: profiles } = await supabase
    .from("profiles")
    .select("avatar_url");

  // Extract filenames from URLs
  const referencedFiles = new Set<string>();

  const extractFilename = (url: string | null) => {
    if (!url || !url.includes(BUCKET_NAME)) return null;
    const parts = url.split("/");
    const filename = parts[parts.length - 1];
    // Check if it's in avatars subfolder
    if (url.includes("/avatars/")) {
      return `avatars/${filename}`;
    }
    return filename;
  };

  postImages?.forEach(img => {
    const name = extractFilename(img.image_url);
    if (name) referencedFiles.add(name);
  });

  posts?.forEach(post => {
    const name = extractFilename(post.image_url);
    if (name) referencedFiles.add(name);
  });

  profiles?.forEach(profile => {
    const name = extractFilename(profile.avatar_url);
    if (name) referencedFiles.add(name);
  });

  console.log(`   Found ${referencedFiles.size} referenced files in database\n`);

  // 3. Find orphaned files
  const orphanedFiles = allStorageFiles.filter(file => !referencedFiles.has(file));

  if (orphanedFiles.length === 0) {
    console.log("✅ No orphaned files found! Storage is clean.\n");
    return;
  }

  console.log(`🗑️  Found ${orphanedFiles.length} orphaned files:\n`);
  orphanedFiles.forEach(file => console.log(`   - ${file}`));
  console.log();

  // 4. Delete orphaned files
  console.log("🔥 Deleting orphaned files...");

  const { error: deleteError } = await supabase.storage
    .from(BUCKET_NAME)
    .remove(orphanedFiles);

  if (deleteError) {
    console.error("Failed to delete files:", deleteError);
    process.exit(1);
  }

  console.log(`\n✅ Successfully deleted ${orphanedFiles.length} orphaned files!`);
  console.log("   Storage has been cleaned up.\n");
}

cleanupStorage().catch(console.error);
