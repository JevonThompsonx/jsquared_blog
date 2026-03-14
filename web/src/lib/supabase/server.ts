import "server-only";

import { createClient } from "@supabase/supabase-js";

import { getServerEnv } from "@/lib/env";

export function getSupabaseServerClient() {
  const env = getServerEnv();

  if (!env.SUPABASE_URL || !env.SUPABASE_ANON_KEY) {
    throw new Error("Supabase server env vars are not configured.");
  }

  return createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);
}
