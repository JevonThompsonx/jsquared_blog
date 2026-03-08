// server/src/middleware/auth.ts
import { createMiddleware } from "hono/factory";
import { createClient, type User, type SupabaseClient } from "@supabase/supabase-js";
import { getRuntimeEnv } from "../lib/runtime-env";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Bindings {
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
  ADMIN_GITHUB_USERNAME?: string;
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
  const runtimeEnv = getRuntimeEnv(c);
  const supabaseUrl = c.env.SUPABASE_URL || runtimeEnv.SUPABASE_URL;
  const supabaseAnonKey = c.env.SUPABASE_ANON_KEY || runtimeEnv.SUPABASE_ANON_KEY;
  const supabaseServiceRoleKey = c.env.SUPABASE_SERVICE_ROLE_KEY || runtimeEnv.SUPABASE_SERVICE_ROLE_KEY;
  const adminGithubUsername = c.env.ADMIN_GITHUB_USERNAME || runtimeEnv.ADMIN_GITHUB_USERNAME;

  if (!supabaseUrl || !supabaseAnonKey) {
    return c.json({ error: "Server misconfiguration" }, 500);
  }

  // 1. Require a Bearer token in the Authorization header.
  const authHeader = c.req.header("Authorization");

  if (!authHeader?.startsWith("Bearer ")) {
    return c.json({ error: "Unauthorized: Missing or invalid token" }, 401);
  }

  const token = authHeader.slice("Bearer ".length);

  // 2. Create a Supabase client scoped to this user's JWT.
  //    This client only performs operations the user's RLS policies allow.
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
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
  //    Prefer the service role client when available so auth does not depend on profile RLS.
  const roleClient = createClient(
    supabaseUrl,
    supabaseServiceRoleKey?.trim() || supabaseAnonKey,
  );

  const { data: profile } = await roleClient
    .from("profiles")
    .select("role, username")
    .eq("id", user.id)
    .single();

  const allowedGithubUsername = adminGithubUsername?.trim().toLowerCase();
  const metadataGithubUsername = typeof user.user_metadata?.user_name === "string"
    ? user.user_metadata.user_name.toLowerCase()
    : typeof user.user_metadata?.preferred_username === "string"
      ? user.user_metadata.preferred_username.toLowerCase()
      : null;

  const isAllowedGithubAdmin = Boolean(
    allowedGithubUsername && metadataGithubUsername && metadataGithubUsername === allowedGithubUsername,
  );

  const resolvedRole = isAllowedGithubAdmin ? "admin" : profile?.role;

  // 5. Attach the role-enriched user and the JWT-scoped client to request context.
  const userWithRole: UserWithRole = {
    ...user,
    role: resolvedRole ?? undefined,
  };

  c.set("supabase", supabase);
  c.set("user", userWithRole);

  await next();
});
