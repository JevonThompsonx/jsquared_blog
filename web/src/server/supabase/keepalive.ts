import "server-only";

import { getServerEnv } from "@/lib/env";

const KEEPALIVE_TIMEOUT_MS = 10_000;

export interface SupabaseKeepaliveResult {
  ok: true;
  nowIso: string;
  service: "auth";
}

export async function pingSupabaseKeepalive(): Promise<SupabaseKeepaliveResult> {
  const env = getServerEnv();
  const response = await fetch(`${env.SUPABASE_URL}/auth/v1/health`, {
    method: "GET",
    headers: {
      apikey: env.SUPABASE_ANON_KEY,
    },
    cache: "no-store",
    signal: AbortSignal.timeout(KEEPALIVE_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new Error(`Supabase keepalive failed with status ${response.status}`);
  }

  return {
    ok: true,
    nowIso: new Date().toISOString(),
    service: "auth",
  };
}
