/**
 * Utility script to fix category inconsistencies in the database
 * Run with: bun run server/src/fix-categories.ts
 * 
 * This script will:
 * 1. Convert empty string categories to NULL
 * 2. Map common custom categories to predefined ones
 * 3. Set unmapped categories to "Other"
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { join } from "path";

// Load environment variables from .dev.vars file
try {
  const devVarsPath = join(__dirname, "..", ".dev.vars");
  const devVars = readFileSync(devVarsPath, "utf-8");
  
  devVars.split("\n").forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#")) {
      const [key, ...valueParts] = trimmed.split("=");
      const value = valueParts.join("=").trim();
      process.env[key.trim()] = value;
    }
  });
} catch {
  console.log("⚠️  Could not load .dev.vars file, using system environment variables");
}

// Load environment variables
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables");
  console.log("Create a .dev.vars file in the server directory with:");
  console.log("SUPABASE_URL=your_supabase_url");
  console.log("SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key");
  console.log("\nNote: Service role key is required to bypass RLS and update posts");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Mapping of custom categories to predefined ones
const CATEGORY_MAPPINGS: Record<string, string> = {
  "Travel": "Road Trip",
  "Adventure": "Hiking",
  "Test": "Other",
  "Testing": "Other",
  "": "Other", // Empty strings
};

// Specific post title to category mappings (overrides general mappings)
const TITLE_BASED_MAPPINGS: Record<string, string> = {
  "Cozy Cabin Getaway": "Camping",
  "Zip-lining Through the Canopy": "Nature",
  "Rock Climbing Challenge": "Mountains",
  "Baby's first camping trip woo": "Camping",
};

async function fixCategories(dryRun: boolean = true) {
  console.log(dryRun ? "🔍 DRY RUN MODE - No changes will be made\n" : "⚠️  LIVE MODE - Changes will be applied\n");

  // Fetch all posts
  const { data: posts, error } = await supabase
    .from("posts")
    .select("id, title, category, status");

  if (error) {
    console.error("❌ Error fetching posts:", error.message);
    process.exit(1);
  }

  if (!posts || posts.length === 0) {
    console.log("ℹ️  No posts found in database");
    return;
  }

  const updates: Array<{ id: number; title: string; oldCategory: string | null; newCategory: string }> = [];

  // Find posts that need updating
  posts.forEach(post => {
    const category = post.category || "";
    
    // First check title-based mappings (highest priority)
    if (post.title in TITLE_BASED_MAPPINGS) {
      updates.push({
        id: post.id,
        title: post.title,
        oldCategory: post.category,
        newCategory: TITLE_BASED_MAPPINGS[post.title]
      });
    }
    // Then check if category needs general mapping
    else if (category in CATEGORY_MAPPINGS) {
      updates.push({
        id: post.id,
        title: post.title,
        oldCategory: post.category,
        newCategory: CATEGORY_MAPPINGS[category]
      });
    }
  });

  if (updates.length === 0) {
    console.log("✅ No categories need fixing!");
    return;
  }

  console.log(`📝 Found ${updates.length} post(s) to update:\n`);
  
  updates.forEach(update => {
    const oldCat = update.oldCategory === null ? "NULL" : update.oldCategory === "" ? '""' : `"${update.oldCategory}"`;
    console.log(`   Post #${update.id}: "${update.title}"`);
    console.log(`   ${oldCat} → "${update.newCategory}"`);
    console.log();
  });

  if (dryRun) {
    console.log("\n💡 This was a dry run. To apply changes, run:");
    console.log("   bun run server/src/fix-categories.ts --apply\n");
    return;
  }

  // Apply updates
  console.log("🔄 Applying updates...\n");
  let successCount = 0;
  let errorCount = 0;

  for (const update of updates) {
    const { error } = await supabase
      .from("posts")
      .update({ category: update.newCategory })
      .eq("id", update.id);

    if (error) {
      console.error(`❌ Failed to update post #${update.id}:`, error.message);
      errorCount++;
    } else {
      console.log(`✅ Updated post #${update.id}`);
      successCount++;
    }
  }

  console.log("\n📊 Results:");
  console.log(`   ✅ Successfully updated: ${successCount}`);
  console.log(`   ❌ Failed: ${errorCount}`);
  console.log(`   📝 Total: ${updates.length}`);
}

// Check for --apply flag
const applyMode = process.argv.includes("--apply");

// Run the fix
fixCategories(!applyMode)
  .then(() => {
    console.log("\n✨ Category fix complete!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Error:", error);
    process.exit(1);
  });
