// server/src/middleware/auth.ts
import { createMiddleware } from "hono/factory";
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase requires these generic params; no generated DB types in this project
import { createClient, type User, type SupabaseClient } from "@supabase/supabase-js";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Bindings {
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
}

export interface UserWithRole extends User {
  role?: string;
}

interface Variables {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- no generated Supabase schema types available
  supabase: SupabaseClient<any, "public", any>;
  user: UserWithRole;
}

interface HonoEnv {
  Bindings: Bindings;
  Variables: Variables;
}

// ─── Middleware ───────────────────────────────────────────────────────────────

export const authMiddleware = createMiddleware<HonoEnv>(async (c, next) => {
  // 1. Require a Bearer token in the Authorization header.
  const authHeader = c.req.header("Authorization");

  if (!authHeader?.startsWith("Bearer ")) {
    return c.json({ error: "Unauthorized: Missing or invalid token" }, 401);
  }

  const token = authHeader.slice("Bearer ".length);

  // 2. Create a Supabase client scoped to this user's JWT.
  //    This client only performs operations the user's RLS policies allow.
  const supabase = createClient(c.env.SUPABASE_URL, c.env.SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  // 3. Verify the token by fetching the user record from Supabase Auth.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return c.json({ error: "Unauthorized: Invalid user token" }, 401);
  }

  // 4. Fetch the user's role from the profiles table.
  //    We use a fresh anonymous client here to sidestep any RLS that would
  //    prevent the user from reading their own profile via the JWT client.
  const anonClient = createClient(c.env.SUPABASE_URL, c.env.SUPABASE_ANON_KEY);

  const { data: profile } = await anonClient
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  // 5. Attach the role-enriched user and the JWT-scoped client to request context.
  const userWithRole: UserWithRole = {
    ...user,
    role: profile?.role ?? undefined,
  };

  c.set("supabase", supabase);
  c.set("user", userWithRole);

  await next();
});
