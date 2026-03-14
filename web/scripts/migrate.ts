import path from "node:path";

import { migrate } from "drizzle-orm/libsql/migrator";

import { getDb } from "../src/lib/db-core";

async function main() {
  const db = getDb();

  await migrate(db, {
    migrationsFolder: path.resolve(process.cwd(), "drizzle"),
  });

  console.log("Applied Drizzle migrations.");
}

void main();
