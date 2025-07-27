import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { createClient } from "@supabase/supabase-js";
import type { ApiResponse } from "shared/dist";

const app = new Hono();

// --- SUPABASE CLIENT ---
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!,
);

// --- API ROUTES ---
app
  .get("/", (c) => {
    return c.text("Hello Hono!");
  })
  .get("/hello", async (c) => {
    const data: ApiResponse = {
      message: "Hello BHVR!",
      success: true,
    };
    return c.json(data, { status: 200 });
  })
  .get("/api/posts", async (c) => {
    const { data, error } = await supabase
      .from("posts") // The table name we created
      .select("*") // Select all columns
      .order("created_at", { ascending: false }); // Show newest posts first

    if (error) {
      return c.json({ error: error.message }, 500);
    }

    return c.json(data);
  })
  // highlight-start
  .post("/api/posts", async (c) => {
    // 1. Parse the incoming request body to get post data.
    const postData = await c.req.json();

    // 2. You might want to add validation here to ensure all required fields are present.
    if (!postData.title || !postData.type) {
      return c.json({ error: "Title and type are required" }, 400);
    }

    // 3. Insert the new post into the 'posts' table in Supabase.
    const { data, error } = await supabase
      .from("posts")
      .insert([
        {
          title: postData.title,
          description: postData.description,
          image_url: postData.image_url,
          category: postData.category,
          type: postData.type,
          grid_class: postData.grid_class,
          // author_id would typically come from an authenticated user session
        },
      ])
      .select(); // .select() returns the newly created record

    // 4. Handle any potential errors from the database operation.
    if (error) {
      return c.json({ error: error.message }, 500);
    }

    // 5. Return the newly created post data with a 201 Created status.
    return c.json(data, 201);
  });
// highlight-end

// --- SERVER SETUP ---
const port = 3000;
console.log(`✅ Server is running on port ${port}`);

serve({
  fetch: app.fetch,
  port,
});

export default app;
