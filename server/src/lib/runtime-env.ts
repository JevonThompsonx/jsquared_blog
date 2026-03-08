import { env as honoEnv } from "hono/adapter";
import type { Context } from "hono";

export const getRuntimeEnv = (c: Context): Record<string, string | undefined> => {
  const adapterEnv = honoEnv(c);
  const safeAdapterEnv = adapterEnv && typeof adapterEnv === "object"
    ? Object.fromEntries(
        Object.entries(adapterEnv).map(([key, value]) => [key, typeof value === "string" ? value : undefined]),
      )
    : {};

  return {
    ...safeAdapterEnv,
    SUPABASE_URL: process.env.SUPABASE_URL,
    SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    DEV_MODE: process.env.DEV_MODE,
    ADMIN_GITHUB_USERNAME: process.env.ADMIN_GITHUB_USERNAME,
  };
};
