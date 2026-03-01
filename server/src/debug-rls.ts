import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve } from "path";

const devVarsPath = resolve(__dirname, "..", ".dev.vars");
try {
  const devVars = readFileSync(devVarsPath, "utf-8");
  devVars.split("\n").forEach((line) => {
    if (line.trim() && !line.startsWith("#")) {
      const [key, ...values] = line.split("=");
      const value = values.join("=").replace(/^"|"$/g, "");
      process.env[key.trim()] = value.trim();
    }
  });
} catch {
  console.warn("⚠️  Could not load .dev.vars file");
}

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_ANON_KEY");
  process.exit(1);
}

const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const adminClient = SUPABASE_SERVICE_ROLE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
  : null;

async function run() {
  const ids = [42, 43];

  const anonResponse = await anonClient
    .from("posts")
    .select("id, status, published_at")
    .in("id", ids)
    .eq("status", "published");

  console.log("Anon response:", anonResponse);

  if (adminClient) {
    const adminResponse = await adminClient
      .from("posts")
      .select("id, status, published_at")
      .in("id", ids);
    console.log("Service role response:", adminResponse);
  } else {
    console.log("No service role client configured");
  }
}

run().catch((error) => {
  console.error("Debug failed:", error);
  process.exit(1);
});
