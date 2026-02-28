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

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_ANON_KEY");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function run() {
  const targetIdArg = process.argv[2];
  const targetId = targetIdArg ? Number(targetIdArg) : null;

  const { data, error } = await supabase
    .from("posts")
    .select("id")
    .order("id", { ascending: true })
    .limit(5);

  if (error) {
    console.error("List error:", error);
    process.exit(1);
  }

  const ids = data?.map((row) => row.id) ?? [];
  console.log("Sample IDs:", ids);

  if (ids.length === 0) {
    console.log("No posts available");
    return;
  }

  const resolvedId = Number.isInteger(targetId) ? targetId : ids[0];
  const response = await supabase
    .from("posts")
    .select("*")
    .eq("id", resolvedId)
    .limit(1);

  console.log("Post query result:", response);
}

run().catch((error) => {
  console.error("Debug failed:", error);
  process.exit(1);
});
