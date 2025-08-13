import { Hono } from "hono";
import { logger } from "hono/logger";
import { createClient, User, SupabaseClient } from "@supabase/supabase-js";

import { authMiddleware } from "./middleware/auth"; // Import the new middleware

// Define the environment variables (Bindings) expected by the Worker
interface Bindings {
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  CLOUDFLARE_ACCOUNT_ID: string; // New
  CLOUDFLARE_API_TOKEN: string;  // New
  CLOUDFLARE_IMAGES_ACCOUNT_HASH: string; // New
}

// Define the Variables expected by the Worker
interface Variables {
  supabase: SupabaseClient<any, 'public', any>; // Explicitly type SupabaseClient
  user: User;
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

// Helper to interact with Cloudflare Images API
async function uploadImageToCloudflareImages(
  imageBuffer: ArrayBuffer,
  imageName: string,
  contentType: string,
  env: Bindings
): Promise<string> {
  const formData = new FormData();
  formData.append('file', new Blob([imageBuffer], { type: contentType }), imageName);

  const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${env.CLOUDFLARE_ACCOUNT_ID}/images/v1`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.CLOUDFLARE_API_TOKEN}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const errorData = await response.json();
    console.error('Cloudflare Images upload error (full response):', JSON.stringify(errorData, null, 2)); // Log full error data
    throw new Error(`Cloudflare Images upload failed: ${errorData.errors?.[0]?.message || response.statusText}`);
  }

  const result = await response.json();
  return result.result.id; // Return the Cloudflare Image ID
}

async function deleteImageFromCloudflareImages(
  imageId: string,
  env: Bindings,
) {
  const url = `https://api.cloudflare.com/client/v4/accounts/${env.CLOUDFLARE_ACCOUNT_ID}/images/v1/${imageId}`;
  const response = await fetch(url, {
    method: "DELETE",
    headers: {
      "Authorization": `Bearer ${env.CLOUDFLARE_API_TOKEN}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const errorData = await response.json();
    console.error('Cloudflare Images delete error (full response):', JSON.stringify(errorData, null, 2));
    throw new Error(`Cloudflare Images deletion failed: ${errorData.errors?.[0]?.message || response.statusText}`);
  }
  return response.json();
}

async function reassignAllPostLayouts(
  supabase: SupabaseClient<any, 'public', any>,
  layoutPatterns: { type: PostType; grid_class: string }[]
) {
  const { data: allPosts, error: fetchAllError } = await supabase
    .from("posts")
    .select("*")
    .order("created_at", { ascending: false }); // Order by creation date to ensure consistent pattern application

  if (fetchAllError) {
    console.error("Error fetching all posts for re-assignment:", fetchAllError);
    return;
  }

  if (!allPosts || allPosts.length === 0) {
    
    return;
  }

  const updates = allPosts.map((post, index) => {
    const patternIndex = index % layoutPatterns.length;
    const selectedPattern = layoutPatterns[patternIndex];

    let assignedType: PostType = selectedPattern.type;
    // Randomly assign 'hover' to vertical types with 70% probability
    if (assignedType === "split-vertical" && Math.random() < 0.7) {
      assignedType = "hover";
    }
    const assignedGridClass = selectedPattern.grid_class;

    return {
      ...post, // Include all existing properties of the post
      type: assignedType,
      grid_class: assignedGridClass,
    };
  });

  // Perform batch updates
  const { error: updateError } = await supabase
    .from("posts")
    .upsert(updates, { onConflict: "id" }); // Use upsert with onConflict to update existing records

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
  const { data, error } = await supabase
    .from("posts")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return c.json({ error: error.message }, 500);
  }

  return c.json(data, {
    headers: {
      "Cache-Control": "public, max-age=3600", // Cache for 1 hour
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

  const envBindings: Bindings = c.env; // Explicitly type c.env

  if (imageFile) {
    // --- Image Upload Handling with Cloudflare Images Optimization ---
    try {
      const arrayBuffer = await imageFile.arrayBuffer();
      const contentType = imageFile.type;
      const originalFileName = imageFile.name;

      // Directly upload to Cloudflare Images
      const imageId = await uploadImageToCloudflareImages(
        arrayBuffer,
        originalFileName,
        contentType,
        envBindings
      );

      // Construct final URL using Cloudflare Images delivery
      finalImageUrl = `https://imagedelivery.net/${c.env.CLOUDFLARE_IMAGES_ACCOUNT_HASH}/${imageId}/webp`;
    } catch (error: any) {
      console.error("Image optimization/upload process failed:", error);
      return c.json({ error: `Image optimization/upload failed: ${error.message}` }, 500);
    }
  } else if (imageUrl) {
    // --- Image URL Handling ---
    finalImageUrl = imageUrl;
  }

  // --- Dynamic Layout Assignment ---
  const { count: totalPosts, error: countError } = await supabase
    .from("posts")
    .select("*", { count: "exact", head: true });

  if (countError) {
    console.error("Error fetching post count:", countError);
    return c.json({ error: "Failed to determine post layout" }, 500);
  }

  let assignedType: "split-horizontal" | "split-vertical" | "hover";
  let assignedGridClass: string;

  // Define a sequence of layout patterns to cycle through
  // This provides a mix of vertical, horizontal, and hover styles
  // and aims to create a visually dense layout without awkward gaps.
  // The `row-span` values are crucial for how items are placed in the CSS Grid.
  const layoutPatterns: { type: PostType; grid_class: string }[] = [
    // Pattern 1: Horizontal (2/3 width, 1/3 height)
    { type: "split-horizontal", grid_class: "md:col-span-2 row-span-1" },
    // Pattern 2: Vertical (1/3 width, 2/3 height) - will often become hover
    { type: "split-vertical", grid_class: "md:col-span-1 row-span-2" },
    // Pattern 3: Directly Hover
    { type: "hover", grid_class: "md:col-span-1 row-span-1" },
    // Pattern 4: Another Horizontal
    { type: "split-horizontal", grid_class: "md:col-span-2 row-span-1" },
    // Pattern 5: Directly Hover (more frequent)
    { type: "hover", grid_class: "md:col-span-1 row-span-1" },
    // Pattern 6: Vertical (will often become hover)
    { type: "split-vertical", grid_class: "md:col-span-1 row-span-2" },
    // Pattern 7: Directly Hover (even more frequent)
    { type: "hover", grid_class: "md:col-span-1 row-span-1" },
    // Pattern 8: Horizontal again
    { type: "split-horizontal", grid_class: "md:col-span-2 row-span-1" },
    // Pattern 9: Vertical (will often become hover)
    { type: "split-vertical", grid_class: "md:col-span-1 row-span-2" },
    // Pattern 10: Directly Hover
    { type: "hover", grid_class: "md:col-span-1 row-span-1" },
  ];

  // Determine the index for the layout pattern based on the total number of posts
  // This ensures a cycling and dynamic assignment for each new post.
  const patternIndex = (totalPosts || 0) % layoutPatterns.length;
  const selectedPattern = layoutPatterns[patternIndex];

  assignedType = selectedPattern.type;
  // Randomly assign 'hover' to vertical types with 70% probability
  if (assignedType === "split-vertical" && Math.random() < 0.7) {
    assignedType = "hover";
  }
  assignedGridClass = selectedPattern.grid_class;

  
  

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
    // --- Image Upload Handling with Cloudflare Images Optimization (for updates) ---
    try {
      // If there was an old image, delete it from Cloudflare Images
      if (existingPost.image_url && existingPost.image_url.includes('imagedelivery.net')) {
        const oldImageId = existingPost.image_url.split('/')[4]; // Extract imageId from URL
        if (oldImageId) {
          await deleteImageFromCloudflareImages(oldImageId, c.env);
        }
      }

      const arrayBuffer = await imageFile.arrayBuffer();
      const contentType = imageFile.type; // Need contentType for uploadImageToCloudflareImages
      const originalFileName = imageFile.name;

      // Upload new image to Cloudflare Images
      const imageId = await uploadImageToCloudflareImages(
        arrayBuffer,
        originalFileName,
        contentType, // Pass contentType
        c.env,
      );
      

      // Construct final URL using Cloudflare Images delivery
      finalImageUrl = `https://imagedelivery.net/${c.env.CLOUDFLARE_IMAGES_ACCOUNT_HASH}/${imageId}/webp`;
    } catch (error: any) {
      console.error("Image optimization/upload process failed (PUT):", error);
      return c.json({ error: `Image optimization/upload failed: ${error.message}` }, 500);
    }
  } else if (imageUrl !== undefined) { // If imageUrl is explicitly provided (can be null to clear)
    // If an old image existed and a new URL is provided (or cleared), delete the old one from Cloudflare Images
    if (existingPost.image_url && existingPost.image_url.includes('imagedelivery.net') && existingPost.image_url !== imageUrl) {
      const oldImageId = existingPost.image_url.split('/')[4]; // Extract imageId from URL
      if (oldImageId) {
        await deleteImageFromCloudflareImages(oldImageId, c.env);
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

// --- SERVER SETUP ---
// No need for Node.js 'serve' in Cloudflare Workers
export default app;
