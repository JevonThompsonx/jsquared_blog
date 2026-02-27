/**
 * Runtime environment validation for Cloudflare Workers.
 *
 * In Cloudflare Workers, environment variables are passed as bindings (not process.env).
 * This module validates those bindings at request time and throws early with a clear
 * error rather than crashing in an obscure Supabase call.
 *
 * Usage: call `validateEnv(env)` at the top of your fetch handler or in a startup middleware.
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
});

export type ValidatedEnv = z.infer<typeof envSchema>;

/**
 * Validates the Cloudflare Worker bindings object.
 * Throws a `Response` (500) if required variables are missing or malformed.
 *
 * Call this once in a middleware that runs before any route handler:
 *   app.use("*", envMiddleware);
 */
export function validateEnv(env: unknown): ValidatedEnv {
  const result = envSchema.safeParse(env);
  if (!result.success) {
    const missing = result.error.issues.map((i) => i.message).join("; ");
    throw new Error(`Worker misconfiguration — ${missing}`);
  }
  return result.data;
}
