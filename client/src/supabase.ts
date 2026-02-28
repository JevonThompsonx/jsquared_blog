

import { createClient } from "@supabase/supabase-js";
import { createLogger } from "./utils/logger";


const logger = createLogger("supabase");

export const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
export const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;


if (!supabaseUrl || !supabaseAnonKey) {
  logger.error("Missing Supabase env vars", {
    hasUrl: Boolean(supabaseUrl),
    hasAnonKey: Boolean(supabaseAnonKey),
  });
  throw new Error("Supabase URL and Anon Key must be defined in your .env file");
}

try {
  const url = new URL(supabaseUrl);
  logger.info("Supabase client config", {
    host: url.host,
    protocol: url.protocol,
    anonKeyPrefix: supabaseAnonKey.slice(0, 8),
  });
} catch (error) {
  logger.warn("Supabase URL is invalid", { error });
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
