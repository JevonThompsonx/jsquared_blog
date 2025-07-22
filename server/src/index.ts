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
  });

// --- SERVER SETUP ---
const port = 3000;
console.log(`✅ Server is running on port ${port}`);

serve({
  fetch: app.fetch,
  port,
});

export default app;
