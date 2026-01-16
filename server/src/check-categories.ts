/**
 * Utility script to check category consistency in the database
 * Run with: bun run server/src/check-categories.ts
 */

import { createClient } from "@supabase/supabase-js";

// Load environment variables
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error("❌ Missing SUPABASE_URL or SUPABASE_ANON_KEY environment variables");
  console.log("Create a .env file in the server directory with:");
  console.log("SUPABASE_URL=your_supabase_url");
  console.log("SUPABASE_ANON_KEY=your_supabase_anon_key");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Predefined categories from shared types
const VALID_CATEGORIES = [
  "Hiking",
  "Camping",
  "Food",
  "Nature",
  "Culture",
  "Water Sports",
  "Biking",
  "Road Trip",
  "City Adventure",
  "Wildlife",
  "Beach",
  "Mountains",
  "Photography",
  "Winter Sports",
  "Other"
];

async function checkCategories() {
  console.log("🔍 Checking category consistency...\n");

  // Fetch all posts with their categories
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

  console.log(`📊 Total posts: ${posts.length}\n`);

  // Track statistics
  const categoryStats: Record<string, number> = {};
  const invalidCategories: Array<{ id: number; title: string; category: string | null; status: string }> = [];
  const nullCategories: Array<{ id: number; title: string; status: string }> = [];

  posts.forEach(post => {
    if (post.category === null) {
      nullCategories.push({ id: post.id, title: post.title, status: post.status });
    } else if (!VALID_CATEGORIES.includes(post.category)) {
      invalidCategories.push({ id: post.id, title: post.title, category: post.category, status: post.status });
    }
    
    // Track category usage
    const cat = post.category || "null";
    categoryStats[cat] = (categoryStats[cat] || 0) + 1;
  });

  // Display category statistics
  console.log("📈 Category Usage Statistics:");
  console.log("─".repeat(60));
  Object.entries(categoryStats)
    .sort((a, b) => b[1] - a[1])
    .forEach(([category, count]) => {
      const isValid = category === "null" || VALID_CATEGORIES.includes(category);
      const icon = isValid ? "✅" : "⚠️ ";
      console.log(`${icon} ${category.padEnd(20)} : ${count} post(s)`);
    });
  console.log("─".repeat(60));
  console.log();

  // Display issues
  let hasIssues = false;

  if (nullCategories.length > 0) {
    hasIssues = true;
    console.log(`⚠️  Found ${nullCategories.length} post(s) with NULL category:`);
    nullCategories.forEach(post => {
      console.log(`   - Post #${post.id}: "${post.title}" [${post.status}]`);
    });
    console.log();
  }

  if (invalidCategories.length > 0) {
    hasIssues = true;
    console.log(`⚠️  Found ${invalidCategories.length} post(s) with invalid/custom categories:`);
    invalidCategories.forEach(post => {
      console.log(`   - Post #${post.id}: "${post.title}" [${post.status}]`);
      console.log(`     Category: "${post.category}"`);
    });
    console.log();
    console.log("💡 These are custom categories not in the predefined list.");
    console.log("   Consider updating them to one of the predefined categories:");
    console.log("   " + VALID_CATEGORIES.join(", "));
    console.log();
  }

  if (!hasIssues) {
    console.log("✅ All categories are valid! No issues found.");
  }

  // Display valid categories for reference
  console.log("\n📋 Valid Predefined Categories:");
  console.log("─".repeat(60));
  VALID_CATEGORIES.forEach((cat, index) => {
    console.log(`   ${(index + 1).toString().padStart(2)}. ${cat}`);
  });
  console.log("─".repeat(60));
}

// Run the check
checkCategories()
  .then(() => {
    console.log("\n✨ Category check complete!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Error:", error);
    process.exit(1);
  });
