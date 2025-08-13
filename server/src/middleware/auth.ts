// server/src/middleware/auth.ts

import { createMiddleware } from "hono/factory";
import { createClient, User, SupabaseClient } from "@supabase/supabase-js";

// Define the environment variables (Bindings) expected by the Worker
interface Bindings {
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
}

// Define the Variables expected by the Worker
interface Variables {
  supabase: SupabaseClient<any, 'public', any>; // Explicitly type SupabaseClient
  user: User;
}

// Define the Hono environment type for middleware
interface HonoEnv {
  Bindings: Bindings;
  Variables: Variables;
}

export const authMiddleware = createMiddleware<HonoEnv>(async (c, next) => {
  // 1. Get the Authorization header
  const authHeader = c.req.header("Authorization");
  
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return c.json({ error: "Unauthorized: Missing or invalid token" }, 401);
  }

  const token = authHeader.split(" ")[1];
  

  // 2. Create a temporary Supabase client with the user's token
  // This client can only perform actions the user is allowed to.
  const supabase = createClient(
    c.env.SUPABASE_URL, // Use c.env for Cloudflare Workers
    c.env.SUPABASE_ANON_KEY, // Use c.env for Cloudflare Workers
    {
      global: {
        headers: { Authorization: `Bearer ${token}` },
      },
    },
  );

  // 3. Check if the user is valid by getting their session
  const {
    data: { user },
  } = await supabase.auth.getUser();
  

  if (!user) {
    return c.json({ error: "Unauthorized: Invalid user token" }, 401);
  }

  // 4. Make the user-specific client and user object available to the route handler
  c.set("supabase", supabase);
  c.set("user", user);

  await next();
});
