// server/src/index.ts

// server/src/index.ts

import { Hono } from "hono/cloudflare"; // Changed import for Cloudflare Workers
import { logger } from "hono/logger";
import { createClient, User } from "@supabase/supabase-js";
import type { ApiResponse } from "shared/dist";
import { authMiddleware } from "./middleware/auth"; // Import the new middleware

// Define the environment variables (Bindings) expected by the Worker
interface Bindings {
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
}

const app = new Hono<{
  Bindings: Bindings; // Add Bindings for environment variables
  Variables: {
    supabase: ReturnType<typeof createClient>;
    user: User;
  };
}>();

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

  return c.json(data);
});

// --- PROTECTED ROUTES (Auth Required) ---
app.post("/api/posts", authMiddleware, async (c) => {
  // Get the user-specific Supabase client and user object from the middleware
  const supabase = c.get("supabase");
  const user = c.get("user");
  const postData = await c.req.json();

  if (!postData.title || !postData.type) {
    return c.json({ error: "Title and type are required" }, 400);
  }

  // Insert the new post into the 'posts' table with the authenticated user's ID
  const { data, error } = await supabase
    .from("posts")
    .insert([
      {
        // Your existing fields
        title: postData.title,
        description: postData.description,
        image_url: postData.image_url,
        category: postData.category,
        type: postData.type,
        grid_class: postData.grid_class,
        // Add the author_id from the authenticated user
        author_id: user.id,
      },
    ])
    .select();

  if (error) {
    return c.json({ error: error.message }, 500);
  }

  return c.json(data, 201);
});

// --- SERVER SETUP ---
// No need for Node.js 'serve' in Cloudflare Workers
export default app;
