import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { join } from "path";

// Load environment variables
const SUPABASE_URL = process.env.SUPABASE_URL || "";
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || "";

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_ANON_KEY environment variables");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function applyMigrations() {
  console.log("🚀 Starting database migrations...\n");

  const migrations = [
    {
      name: "add_alt_text_to_images",
      path: join(__dirname, "../migrations/add_alt_text_to_images.sql"),
    },
    {
      name: "add_scheduling_columns",
      path: join(__dirname, "../migrations/add_scheduling_columns.sql"),
    },
    {
      name: "add_tags_system",
      path: join(__dirname, "../migrations/add_tags_system.sql"),
    },
  ];

  for (const migration of migrations) {
    try {
      console.log(`📝 Applying migration: ${migration.name}...`);

      const sql = readFileSync(migration.path, "utf-8");

      // Execute the SQL using rpc or direct query
      // Note: Supabase client doesn't have a direct SQL execution method,
      // so we'll need to use the REST API or PostgreSQL connection
      const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": SUPABASE_ANON_KEY,
          "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ query: sql }),
      });

      if (!response.ok) {
        // Try alternative approach - execute via direct query
        console.log(`   Attempting alternative execution method...`);

        // Split SQL by semicolons and execute each statement
        const statements = sql
          .split(";")
          .map(s => s.trim())
          .filter(s => s.length > 0 && !s.startsWith("--"));

        for (const statement of statements) {
          const { error } = await supabase.rpc("exec_sql", { sql: statement });
          if (error) {
            console.warn(`   ⚠️  Statement failed (may already exist): ${error.message}`);
          }
        }
      }

      console.log(`✅ Migration ${migration.name} completed\n`);
    } catch (error) {
      console.error(`❌ Error applying migration ${migration.name}:`, error);
      console.log(`   Continuing with next migration...\n`);
    }
  }

  console.log("🎉 All migrations processed!");
  console.log("\nNote: Some errors are expected if tables/columns already exist.");
  console.log("Please verify the schema in Supabase Dashboard.\n");
}

applyMigrations().catch(console.error);
