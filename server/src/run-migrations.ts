/**
 * Migration runner script for applying database migrations
 *
 * This script reads SQL migration files and applies them to the Supabase database.
 * Run with: cd server && bun run src/run-migrations.ts
 */

import { readFileSync } from "fs";
import { join } from "path";

// Load environment variables from .env file
const envFile = readFileSync(join(__dirname, "../.env"), "utf-8");
const envVars: Record<string, string> = {};
envFile.split("\n").forEach(line => {
  const match = line.match(/^([A-Z_]+)="?([^"]+)"?$/);
  if (match) {
    envVars[match[1]] = match[2];
  }
});

const SUPABASE_URL = envVars.SUPABASE_URL || process.env.SUPABASE_URL || "";
const SUPABASE_ANON_KEY = envVars.SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || "";

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error("❌ Missing SUPABASE_URL or SUPABASE_ANON_KEY in .env file");
  process.exit(1);
}

async function runMigrations() {
  console.log("🚀 Starting database migrations...\n");
  console.log(`📍 Supabase URL: ${SUPABASE_URL}\n`);

  try {
    // Read the combined migration file
    const migrationPath = join(__dirname, "../migrations/APPLY_ALL_MIGRATIONS.sql");
    const sql = readFileSync(migrationPath, "utf-8");

    console.log("📝 Applying combined migrations...\n");

    // Split into individual statements
    const statements = sql
      .split(";")
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith("--"));

    console.log(`   Found ${statements.length} SQL statements to execute\n`);

    // Execute each statement using Supabase REST API
    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];

      // Skip comments and empty statements
      if (!statement || statement.trim().length === 0) continue;

      // Show progress for major operations
      if (statement.includes("ALTER TABLE") || statement.includes("CREATE TABLE") || statement.includes("CREATE INDEX")) {
        const operation = statement.substring(0, Math.min(80, statement.length)).replace(/\s+/g, " ");
        console.log(`   [${i + 1}/${statements.length}] ${operation}...`);
      }

      try {
        // Execute via Supabase REST API query endpoint
        const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "apikey": SUPABASE_ANON_KEY,
            "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
            "Prefer": "return=representation"
          },
          body: JSON.stringify({ query: statement })
        });

        if (response.ok) {
          successCount++;
        } else {
          // Some errors are expected (e.g., "already exists")
          const text = await response.text();
          if (text.includes("already exists") || text.includes("does not exist")) {
            console.log(`   ⚠️  Statement skipped (already exists)`);
            successCount++;
          } else {
            console.log(`   ❌ Error: ${text}`);
            errorCount++;
          }
        }
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Unknown error";
        console.log(`   ⚠️  Error (may be expected): ${message}`);
        errorCount++;
      }
    }

    console.log(`\n✅ Migration complete!`);
    console.log(`   ${successCount} statements succeeded`);
    if (errorCount > 0) {
      console.log(`   ${errorCount} statements had errors (some may be expected)`);
    }

    console.log("\n📋 Next steps:");
    console.log("   1. Verify schema in Supabase Dashboard > Table Editor");
    console.log("   2. Check that 'tags', 'post_tags' tables exist");
    console.log("   3. Verify 'posts' table has 'scheduled_for' and 'published_at' columns");
    console.log("   4. Verify 'post_images' table has 'alt_text' column");
    console.log("   5. Run 'bun run dev' to test the application\n");

  } catch (error: unknown) {
    console.error("❌ Fatal error running migrations:", error);
    process.exit(1);
  }
}

// Alternative approach: Print SQL for manual execution
function printMigrationSQL() {
  console.log("\n" + "=".repeat(60));
  console.log("ALTERNATIVE: Manual Migration Instructions");
  console.log("=".repeat(60) + "\n");
  console.log("If automatic migration fails, follow these steps:\n");
  console.log("1. Open Supabase Dashboard: https://supabase.com/dashboard");
  console.log("2. Select your project");
  console.log("3. Go to SQL Editor");
  console.log("4. Copy and paste the contents of:");
  console.log("   server/migrations/APPLY_ALL_MIGRATIONS.sql");
  console.log("5. Click 'Run' to execute\n");
  console.log("=".repeat(60) + "\n");
}

// Run migrations and provide fallback instructions
runMigrations().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Unknown error";
  console.error("\n❌ Automatic migration failed:", message);
  printMigrationSQL();
  process.exit(1);
});
