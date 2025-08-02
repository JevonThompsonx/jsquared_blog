// client/src/supabase.ts

import { createClient } from "@supabase/supabase-js";

// Get the environment variables from Vite's import.meta.env
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Check if the variables are set
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Supabase URL and Anon Key must be defined in your .env file",
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
