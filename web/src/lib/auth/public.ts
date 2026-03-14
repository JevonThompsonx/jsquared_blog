import "server-only";

import type { User } from "@supabase/supabase-js";

import { getSupabaseServerClient } from "@/lib/supabase/server";

export async function getPublicUser(): Promise<User | null> {
  try {
    const supabase = getSupabaseServerClient();
    const result = await supabase.auth.getUser();
    return result.data.user ?? null;
  } catch {
    return null;
  }
}
