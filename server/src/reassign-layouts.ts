import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: ".env" });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing SUPABASE_URL or SUPABASE_ANON_KEY in .env file");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

type PostType = "split-horizontal" | "split-vertical" | "hover";

// Seeded random number generator for consistent but varied layouts
function seededRandom(seed: number): number {
  const x = Math.sin(seed++) * 10000;
  return x - Math.floor(x);
}

// Improved layout assignment with better distribution
function getRandomLayout(postIndex: number, totalPosts: number): { type: PostType; grid_class: string } {
  // Use post index as seed for consistent randomization
  const random = seededRandom(postIndex * 7 + totalPosts * 3);

  // Distribution: 35% horizontal, 30% vertical, 35% hover
  if (random < 0.35) {
    return { type: "split-horizontal", grid_class: "md:col-span-2 row-span-1" };
  } else if (random < 0.65) {
    return { type: "split-vertical", grid_class: "md:col-span-1 row-span-2" };
  } else {
    return { type: "hover", grid_class: "md:col-span-1 row-span-1" };
  }
}

async function reassignAllLayouts() {
  console.log("Fetching all posts...");

  const { data: allPosts, error: fetchError } = await supabase
    .from("posts")
    .select("*")
    .order("created_at", { ascending: false });

  if (fetchError) {
    console.error("Error fetching posts:", fetchError);
    return;
  }

  if (!allPosts || allPosts.length === 0) {
    console.log("No posts found.");
    return;
  }

  console.log(`Found ${allPosts.length} posts. Reassigning layouts...`);

  // Count distribution
  const distribution = { horizontal: 0, vertical: 0, hover: 0 };

  const updates = allPosts.map((post, index) => {
    const layout = getRandomLayout(index, allPosts.length);

    // Count for statistics
    if (layout.type === "split-horizontal") distribution.horizontal++;
    else if (layout.type === "split-vertical") distribution.vertical++;
    else distribution.hover++;

    return {
      ...post,
      type: layout.type,
      grid_class: layout.grid_class,
    };
  });

  console.log("\nLayout Distribution:");
  console.log(`- Horizontal (2-column): ${distribution.horizontal} (${((distribution.horizontal / allPosts.length) * 100).toFixed(1)}%)`);
  console.log(`- Vertical: ${distribution.vertical} (${((distribution.vertical / allPosts.length) * 100).toFixed(1)}%)`);
  console.log(`- Hover: ${distribution.hover} (${((distribution.hover / allPosts.length) * 100).toFixed(1)}%)`);

  // Perform batch updates
  const { error: updateError } = await supabase
    .from("posts")
    .upsert(updates, { onConflict: "id" });

  if (updateError) {
    console.error("Error updating posts:", updateError);
    return;
  }

  console.log("\n✅ Successfully reassigned all post layouts!");
}

reassignAllLayouts();
