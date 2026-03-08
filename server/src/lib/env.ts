/**
 * Runtime environment validation for Cloudflare Workers, Bun dev, and Vercel.
 *
 * Some runtimes provide request bindings, others provide process.env. This helper
 * merges both sources so the app can run in either environment without changing
 * the route handlers.
 */
import { z } from "zod";

const envSchema = z.object({
  SUPABASE_URL: z
    .string({ required_error: "SUPABASE_URL binding is required" })
    .url("SUPABASE_URL must be a valid URL"),
  SUPABASE_ANON_KEY: z
    .string({ required_error: "SUPABASE_ANON_KEY binding is required" })
    .min(10, "SUPABASE_ANON_KEY appears to be missing or truncated"),
  // Optional bindings — validated only when present
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  DEV_MODE: z.string().optional(),
  ADMIN_GITHUB_USERNAME: z.string().optional(),
});

export type ValidatedEnv = z.infer<typeof envSchema>;

const readString = (source: unknown, key: string): string | undefined => {
  if (!source || typeof source !== "object") return undefined;

  for (const [entryKey, entryValue] of Object.entries(source)) {
    if (entryKey === key && typeof entryValue === "string" && entryValue.length > 0) {
      return entryValue;
    }
  }

  return undefined;
};

export function validateEnv(bindings: unknown, runtimeEnv?: Record<string, string | undefined>): ValidatedEnv {
  const candidate = {
    SUPABASE_URL: readString(bindings, "SUPABASE_URL") ?? runtimeEnv?.SUPABASE_URL,
    SUPABASE_ANON_KEY: readString(bindings, "SUPABASE_ANON_KEY") ?? runtimeEnv?.SUPABASE_ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY:
      readString(bindings, "SUPABASE_SERVICE_ROLE_KEY") ?? runtimeEnv?.SUPABASE_SERVICE_ROLE_KEY,
    DEV_MODE: readString(bindings, "DEV_MODE") ?? runtimeEnv?.DEV_MODE,
    ADMIN_GITHUB_USERNAME:
      readString(bindings, "ADMIN_GITHUB_USERNAME") ?? runtimeEnv?.ADMIN_GITHUB_USERNAME,
  };

  const result = envSchema.safeParse(candidate);
  if (!result.success) {
    const missing = result.error.issues.map((i) => i.message).join("; ");
    throw new Error(`Worker misconfiguration — ${missing}`);
  }
  return result.data;
}
