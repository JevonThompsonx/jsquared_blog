import { Hono } from "hono";
import { logger } from "hono/logger";
import { createClient, User, SupabaseClient } from "@supabase/supabase-js";
import { encode as encodeWebP } from "@jsquash/webp";
import { decode as decodeJPEG } from "@jsquash/jpeg";
import { decode as decodePNG } from "@jsquash/png";

import { authMiddleware } from "./middleware/auth"; // Import the new middleware

// Define the environment variables (Bindings) expected by the Worker
interface Bindings {
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
}

// Define custom user type with role
interface UserWithRole extends User {
  role?: string;
}

// Define the Variables expected by the Worker
interface Variables {
  supabase: SupabaseClient<any, 'public', any>; // Explicitly type SupabaseClient
  user: UserWithRole;
}

// Define the Hono environment type
interface HonoEnv {
  Bindings: Bindings;
  Variables: Variables;
}

export type PostType = "split-horizontal" | "split-vertical" | "hover";

export type Post = {
  id: number;
  created_at: string;
  title: string;
  description: string | null;
  image_url: string | null;
  category: string | null;
  author_id: string;
  type: PostType; // Matches database column name
};

interface ApiResponse {
  message: string;
  success: boolean;
}

// Helper to convert images to WebP format
async function convertToWebP(
  imageBuffer: ArrayBuffer,
  contentType: string
): Promise<ArrayBuffer> {
  try {
    let imageData;

    // Decode based on original format
    if (contentType === 'image/jpeg' || contentType === 'image/jpg') {
      imageData = await decodeJPEG(imageBuffer);
    } else if (contentType === 'image/png') {
      imageData = await decodePNG(imageBuffer);
    } else if (contentType === 'image/webp') {
      // Already WebP, return as-is
      return imageBuffer;
    } else {
      throw new Error(`Unsupported image format: ${contentType}`);
    }

    // Encode to WebP with quality setting
    const webpBuffer = await encodeWebP(imageData, { quality: 85 });
    return webpBuffer;
  } catch (error) {
    console.error('WebP conversion error:', error);
    throw new Error(`Failed to convert image to WebP: ${error}`);
  }
}

// Helper to upload image to Supabase Storage
async function uploadImageToSupabase(
  supabase: SupabaseClient,
  imageBuffer: ArrayBuffer,
  fileName: string
): Promise<string> {
  const bucket = 'jsquared_blog';

  // Generate unique filename with timestamp
  const timestamp = Date.now();
  const uniqueFileName = `${timestamp}-${fileName.replace(/\.[^/.]+$/, '')}.webp`;

  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(uniqueFileName, imageBuffer, {
      contentType: 'image/webp',
      upsert: false,
    });

  if (error) {
    console.error('Supabase Storage upload error:', error);
    throw new Error(`Failed to upload image: ${error.message}`);
  }

  // Get public URL
  const { data: urlData } = supabase.storage
    .from(bucket)
    .getPublicUrl(uniqueFileName);

  return urlData.publicUrl;
}

// Helper to delete image from Supabase Storage
async function deleteImageFromSupabase(
  supabase: SupabaseClient,
  imageUrl: string
): Promise<void> {
  const bucket = 'jsquared_blog';

  // Extract filename from URL
  const urlParts = imageUrl.split('/');
  const fileName = urlParts[urlParts.length - 1];

  const { error } = await supabase.storage
    .from(bucket)
    .remove([fileName]);

  if (error) {
    console.error('Supabase Storage delete error:', error);
    throw new Error(`Failed to delete image: ${error.message}`);
  }
}

// Seeded random number generator for consistent but varied layouts
function seededRandom(seed: number): number {
  const x = Math.sin(seed++) * 10000;
  return x - Math.floor(x);
}

// Grid-aware layout assignment that prevents gaps
function getRandomLayout(postIndex: number, totalPosts: number): { type: PostType; grid_class: string } {
  // Use post index as seed for consistent randomization
  const random = seededRandom(postIndex * 7 + totalPosts * 3);

  // Pattern-based assignment to work well with grid
  // We use a repeating pattern with some randomization to ensure good distribution
  const patternPosition = postIndex % 6;

  // Base pattern for every 6 posts (works well with 2, 3, 4 column grids):
  // [hover, horizontal, hover, vertical, hover, hover]
  // This gives us a good mix without too many consecutive 2-column items

  if (patternPosition === 1) {
    // Position 1: horizontal (2-column)
    return { type: "split-horizontal", grid_class: "md:col-span-2 row-span-1" };
  } else if (patternPosition === 3) {
    // Position 3: vertical
    return { type: "split-vertical", grid_class: "md:col-span-1 row-span-2" };
  } else {
    // All other positions: mix between hover and vertical based on random
    if (random < 0.6) {
      return { type: "hover", grid_class: "md:col-span-1 row-span-1" };
    } else {
      return { type: "split-vertical", grid_class: "md:col-span-1 row-span-2" };
    }
  }
}

async function reassignAllPostLayouts(
  supabase: SupabaseClient<any, 'public', any>,
  _layoutPatterns: { type: PostType; grid_class: string }[]
) {
  const { data: allPosts, error: fetchAllError } = await supabase
    .from("posts")
    .select("*")
    .order("created_at", { ascending: false });

  if (fetchAllError) {
    console.error("Error fetching all posts for re-assignment:", fetchAllError);
    return;
  }

  if (!allPosts || allPosts.length === 0) {
    return;
  }

  const updates = allPosts.map((post, index) => {
    const layout = getRandomLayout(index, allPosts.length);

    return {
      ...post,
      type: layout.type,
      grid_class: layout.grid_class,
    };
  });

  // Perform batch updates
  const { error: updateError } = await supabase
    .from("posts")
    .upsert(updates, { onConflict: "id" });

  if (updateError) {
    console.error("Error updating all posts with new layouts:", updateError);
  }
}

const app = new Hono<HonoEnv>(); // Use the explicit HonoEnv

// --- MIDDLEWARE ---
app.use("*", logger());

// --- PUBLIC ROUTES (No Auth Required) ---
app.get("/", (c) => {
  return c.text("Hello Hono!");
});

app.get("/hello", async (c) => {
  const data: ApiResponse = {
    message: "Hello BHVR!",
    success: true,
  };
  return c.json(data, { status: 200 });
});

app.get("/api/posts", async (c) => {
  // Create a temporary, public client for this route using c.env
  const supabase = createClient(
    c.env.SUPABASE_URL,
    c.env.SUPABASE_ANON_KEY,
  );

  // Get pagination parameters from query string
  const limit = parseInt(c.req.query("limit") || "20", 10);
  const offset = parseInt(c.req.query("offset") || "0", 10);
  const search = c.req.query("search") || "";

  // Validate limit (max 100 posts per request)
  const validLimit = Math.min(Math.max(limit, 1), 100);

  // Build query with pagination
  let query = supabase
    .from("posts")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(offset, offset + validLimit - 1);

  // Add search filter if provided
  if (search) {
    query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%,category.ilike.%${search}%`);
  }

  const { data, error, count } = await query;

  if (error) {
    return c.json({ error: error.message }, 500);
  }

  return c.json({
    posts: data,
    total: count,
    limit: validLimit,
    offset: offset,
    hasMore: count ? offset + validLimit < count : false,
  }, {
    headers: {
      "Cache-Control": "public, max-age=300", // Cache for 5 minutes (reduced for paginated content)
    },
  });
});

app.get("/api/posts/:id", async (c) => {
  const { id } = c.req.param();
  const supabase = createClient(
    c.env.SUPABASE_URL,
    c.env.SUPABASE_ANON_KEY,
  );
  const { data, error } = await supabase
    .from("posts")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    return c.json({ error: error.message }, 500);
  }

  if (!data) {
    
    return c.json({ error: "Post not found" }, 404);
  }

  

  return c.json(data, {
    headers: {
      "Cache-Control": "public, max-age=3600", // Cache for 1 hour
    },
  });
});

// --- PROTECTED ROUTES (Auth Required) ---
app.post("/api/posts", authMiddleware, async (c) => {
  const supabase = c.get("supabase");
  const user = c.get("user");
  const body = await c.req.parseBody(); // Parse body as FormData or JSON

  const title = body.title as string;
  const description = (body.description as string) || null;
  const category = (body.category as string) || null;
  // const grid_class = (body.grid_class as string) || null; // grid_class will be determined by server
  const imageFile = body.image as File | undefined; // File from upload
  const imageUrl = body.image_url as string | undefined; // URL from input

  if (!title) {
    return c.json({ error: "Title is required" }, 400);
  }

  let finalImageUrl: string | null = null;

  if (imageFile) {
    // --- Image Upload Handling with WebP Conversion and Supabase Storage ---
    try {
      const arrayBuffer = await imageFile.arrayBuffer();
      const contentType = imageFile.type;
      const originalFileName = imageFile.name;

      // Convert to WebP format
      const webpBuffer = await convertToWebP(arrayBuffer, contentType);

      // Upload to Supabase Storage
      finalImageUrl = await uploadImageToSupabase(
        supabase,
        webpBuffer,
        originalFileName
      );
    } catch (error: any) {
      console.error("Image upload/conversion process failed:", error);
      return c.json({ error: `Image upload failed: ${error.message}` }, 500);
    }
  } else if (imageUrl) {
    // --- Image URL Handling ---
    finalImageUrl = imageUrl;
  }

  // --- Dynamic Layout Assignment with Improved Randomization ---
  const { count: totalPosts, error: countError } = await supabase
    .from("posts")
    .select("*", { count: "exact", head: true });

  if (countError) {
    console.error("Error fetching post count:", countError);
    return c.json({ error: "Failed to determine post layout" }, 500);
  }

  // Use the improved random layout function
  const layout = getRandomLayout(totalPosts || 0, (totalPosts || 0) + 1);
  const assignedType = layout.type;
  const assignedGridClass = layout.grid_class;

  // Keep layoutPatterns for the reassignAllPostLayouts function (though it's not used anymore)
  const layoutPatterns: { type: PostType; grid_class: string }[] = [];

  
  

  // Define the type for the data being inserted into Supabase
  type SupabasePostInsert = {
    title: string;
    description: string | null;
    image_url: string | null;
    category: string | null;
    grid_class: string | null;
    type: "horizontal" | "vertical" | "hover"; // Explicitly use the new types
    author_id: string;
  };

  // Insert the new post into the 'posts' table with the authenticated user's ID
  const { data, error } = await supabase
    .from("posts")
    .insert([
      {
        title: title,
        description: description,
        image_url: finalImageUrl, // Use the determined image URL
        category: category,
        grid_class: assignedGridClass, // Use assigned grid_class
        type: assignedType, // Use assigned type
        author_id: user.id,
      } as SupabasePostInsert,
    ])
    .select();

  

  if (error) {
    console.error("Supabase insert error:", error);
    return c.json({ error: error.message }, 500);
  }

  // After successful post insertion, re-assign layouts for all posts
  
  await reassignAllPostLayouts(supabase, layoutPatterns);
  

  return c.json(data, 201);
});

app.put("/api/posts/:id", authMiddleware, async (c) => {
  const { id } = c.req.param();
  const supabase = c.get("supabase");
  const user = c.get("user");
  const body = await c.req.parseBody(); // Parse body as FormData or JSON

  const title = body.title as string;
  
  const description = (body.description as string) || null;
  const category = (body.category as string) || null;
  const grid_class = (body.grid_class as string) || null;
  const postType = (body.type as PostType) || null;
  const imageFile = body.image as File | undefined; // File from upload
  const imageUrl = body.image_url as string | undefined; // URL from input

  if (!title) {
    return c.json({ error: "Title is required" }, 400);
  }

  // Ensure the user is authorized to edit this post (e.g., is the author or an admin)
  const { data: existingPost, error: fetchError } = await supabase
    .from("posts")
    .select("author_id, image_url, type, grid_class") // Also fetch existing image_url, type, and grid_class
    .eq("id", id)
    .single();

  if (fetchError || !existingPost) {
    return c.json({ error: "Post not found or unauthorized" }, 404);
  }

  if (
    (existingPost.author_id !== user.id && existingPost.author_id !== null) && // If author_id is not null, it must match user.id
    user.role !== 'admin' // Or if the user is an admin
  ) {
    return c.json({ error: "Unauthorized to edit this post" }, 403);
  }

  let finalImageUrl: string | null = existingPost.image_url; // Start with existing image URL

  if (imageFile) {
    // --- Image Upload Handling with WebP Conversion and Supabase Storage (for updates) ---
    try {
      // If there was an old image stored in Supabase, delete it
      if (existingPost.image_url && existingPost.image_url.includes('supabase')) {
        try {
          await deleteImageFromSupabase(supabase, existingPost.image_url);
        } catch (deleteError) {
          console.warn("Failed to delete old image, continuing with upload:", deleteError);
        }
      }

      const arrayBuffer = await imageFile.arrayBuffer();
      const contentType = imageFile.type;
      const originalFileName = imageFile.name;

      // Convert to WebP format
      const webpBuffer = await convertToWebP(arrayBuffer, contentType);

      // Upload new image to Supabase Storage
      finalImageUrl = await uploadImageToSupabase(
        supabase,
        webpBuffer,
        originalFileName
      );
    } catch (error: any) {
      console.error("Image upload/conversion process failed (PUT):", error);
      return c.json({ error: `Image upload failed: ${error.message}` }, 500);
    }
  } else if (imageUrl !== undefined) { // If imageUrl is explicitly provided (can be null to clear)
    // If an old image existed in Supabase and a new URL is provided (or cleared), delete the old one
    if (existingPost.image_url && existingPost.image_url.includes('supabase') && existingPost.image_url !== imageUrl) {
      try {
        await deleteImageFromSupabase(supabase, existingPost.image_url);
      } catch (deleteError) {
        console.warn("Failed to delete old image:", deleteError);
      }
    }
    finalImageUrl = imageUrl;
  }

  

  const { data, error } = await supabase
    .from("posts")
    .update({
      title: title,
      description: description,
      image_url: finalImageUrl, // Use the determined image URL
      category: category,
      grid_class: grid_class !== null ? grid_class : existingPost.grid_class, // Use new grid_class if provided, else existing
      type: postType !== null ? postType : existingPost.type, // Use new type if provided, else existing
    })
    .eq("id", id)
    .select();

  if (error) {
    console.error("Supabase update error:", error);
    return c.json({ error: error.message }, 500);
  }

  return c.json(data, 200);
});

// --- ADMIN ROUTES ---
// Endpoint to manually trigger layout reassignment for all posts
app.post("/api/admin/reassign-layouts", authMiddleware, async (c) => {
  const user = c.get("user");
  const supabase = c.get("supabase");

  // Create a fresh client without JWT to fetch profile (avoids RLS issues)
  const adminCheckClient = createClient(
    c.env.SUPABASE_URL,
    c.env.SUPABASE_ANON_KEY
  );

  // Fetch user's role from profiles table
  const { data: profile, error: profileError } = await adminCheckClient
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profileError) {
    console.error("Error fetching user profile:", profileError);
    return c.json({ error: "Failed to fetch user profile" }, 500);
  }

  // Only allow admins
  if (profile?.role !== 'admin') {
    return c.json({ error: "Unauthorized. Admin access required." }, 403);
  }

  // Fetch all posts
  const { data: allPosts, error: fetchError } = await supabase
    .from("posts")
    .select("*")
    .order("created_at", { ascending: false });

  if (fetchError || !allPosts) {
    return c.json({ error: "Failed to fetch posts" }, 500);
  }

  // Count distribution
  const distribution = { horizontal: 0, vertical: 0, hover: 0 };

  // Reassign layouts
  const updates = allPosts.map((post, index) => {
    const layout = getRandomLayout(index, allPosts.length);

    // Count for statistics
    if (layout.type === "split-horizontal") distribution.horizontal++;
    else if (layout.type === "split-vertical") distribution.vertical++;
    else distribution.hover++;

    return {
      id: post.id,
      type: layout.type,
      grid_class: layout.grid_class,
    };
  });

  // Update each post individually to bypass RLS
  const updatePromises = updates.map(update =>
    supabase
      .from("posts")
      .update({ type: update.type, grid_class: update.grid_class })
      .eq("id", update.id)
  );

  const results = await Promise.all(updatePromises);
  const errors = results.filter(r => r.error);

  if (errors.length > 0) {
    console.error("Some updates failed:", errors);
    return c.json({
      error: "Some updates failed",
      details: errors,
      distribution
    }, 500);
  }

  return c.json({
    message: "Successfully reassigned all layouts",
    total: allPosts.length,
    distribution: {
      horizontal: `${distribution.horizontal} (${((distribution.horizontal / allPosts.length) * 100).toFixed(1)}%)`,
      vertical: `${distribution.vertical} (${((distribution.vertical / allPosts.length) * 100).toFixed(1)}%)`,
      hover: `${distribution.hover} (${((distribution.hover / allPosts.length) * 100).toFixed(1)}%)`
    }
  }, 200);
});

// --- SERVER SETUP ---
// No need for Node.js 'serve' in Cloudflare Workers
export default app;
