import "server-only";

import type { User } from "@supabase/supabase-js";
import { createClient } from "@supabase/supabase-js";

import { getServerEnv } from "@/lib/env";

/**
 * Authenticates an incoming API request by reading the Bearer token from the
 * Authorization header and verifying it with Supabase. Returns the authenticated
 * Supabase user or null if the token is missing or invalid.
 */
export async function getRequestSupabaseUser(request: Request): Promise<User | null> {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return null;
  }

  const token = authHeader.slice("Bearer ".length).trim();
  if (!token) {
    return null;
  }

  const env = getServerEnv();
  if (!env.SUPABASE_URL || !env.SUPABASE_ANON_KEY) {
    return null;
  }

  const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const result = await supabase.auth.getUser();
  return result.data.user ?? null;
}
