import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { join } from "path";

// Load environment variables from .dev.vars file
try {
  const devVarsPath = join(__dirname, "..", ".dev.vars");
  const devVars = readFileSync(devVarsPath, "utf-8");
  
  devVars.split("\n").forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#")) {
      const [key, ...valueParts] = trimmed.split("=");
      const value = valueParts.join("=").trim();
      process.env[key.trim()] = value;
    }
  });
} catch {
  console.log("⚠️  Could not load .dev.vars file");
}

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error("❌ Missing environment variables");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function verify() {
  console.log("🔍 Verifying category updates for sample posts...\n");
  
  const { data, error } = await supabase
    .from('posts')
    .select('id, title, category')
    .in('id', [24, 28, 34, 8, 29])
    .order('id');
  
  if (error) {
    console.error('Error:', error);
    return;
  }
  
  const expected = {
    8: "Camping",
    24: "Camping",
    28: "Mountains",
    29: "Road Trip",
    34: "Nature"
  };
  
  console.log("Sample post categories after update:");
  console.log("─".repeat(60));
  
  let allCorrect = true;
  
  data?.forEach(post => {
    const expectedCat = expected[post.id as keyof typeof expected];
    const actual = post.category || "NULL";
    const match = actual === expectedCat ? "✅" : "❌";
    
    if (actual !== expectedCat) allCorrect = false;
    
    console.log(`${match} Post #${post.id}: "${post.title}"`);
    console.log(`   Expected: ${expectedCat} | Actual: ${actual}`);
  });
  
  console.log("─".repeat(60));
  
  if (allCorrect) {
    console.log("\n✅ All updates verified successfully!");
  } else {
    console.log("\n⚠️  Some updates did not apply correctly");
  }
}

verify();
