#!/usr/bin/env node
/**
 * Apply Drizzle migrations to the configured SQLite/libSQL database.
 *
 * Usage:
 *   TURSO_DATABASE_URL=file:/srv/blog/shared/blog.db node scripts/migrate-database.mjs
 *
 * Prints only the applied count, ledger size, and latest migration hash. It
 * never prints the database URL, auth token, or migration SQL.
 */
import path from "node:path";
import { fileURLToPath } from "node:url";

import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";
import { readMigrationFiles } from "drizzle-orm/migrator";

export function resolveMigrationsFolder(cwd = process.cwd()) {
  return path.resolve(cwd, "drizzle");
}

/**
 * Read the Drizzle ledger. Older databases may not have the table yet, which
 * is equivalent to an empty ledger.
 */
export async function readLedgerRows(client) {
  try {
    const result = await client.execute(
      "select rowid as rowid, id, hash, created_at from __drizzle_migrations order by created_at asc, rowid asc",
    );
    return result.rows.map((row) => ({
      rowid: row.rowid === null ? null : Number(row.rowid),
      id: row.id === null ? null : Number(row.id),
      hash: String(row.hash),
      createdAt: Number(row.created_at),
    }));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (/no such table/i.test(message)) return [];
    throw error;
  }
}

const NORMALIZED_EMAIL_INDEX = "users_primary_email_lower_unique";

async function tableExists(client, table) {
  const result = await client.execute({
    sql: "select count(*) as n from sqlite_master where type = 'table' and name = ?",
    args: [table],
  });
  return Number(result.rows[0]?.n ?? 0) > 0;
}

async function indexExists(client, index) {
  const result = await client.execute({
    sql: "select count(*) as n from sqlite_master where type = 'index' and name = ?",
    args: [index],
  });
  return Number(result.rows[0]?.n ?? 0) > 0;
}

/** Count email groups that collide once lower-cased. Never returns values. */
export async function countDuplicateNormalizedEmails(client) {
  if (!(await tableExists(client, "users"))) return 0;
  const result = await client.execute(
    "select count(*) as n from (select lower(primary_email) as email from users group by lower(primary_email) having count(*) > 1)",
  );
  return Number(result.rows[0]?.n ?? 0);
}

/**
 * Before a migration adds the case-insensitive unique index, prove the data can
 * satisfy it. Reports only how many conflicting groups exist, never addresses.
 */
export async function preflightNormalizedEmailUniqueness(
  client,
  migrationsFolder = resolveMigrationsFolder(),
) {
  const alreadyApplied = await indexExists(client, NORMALIZED_EMAIL_INDEX);
  const migrations = readMigrationFiles({ migrationsFolder });
  const expected = migrations.some((migration) =>
    migration.sql.some((statement) =>
      statement.includes(NORMALIZED_EMAIL_INDEX),
    ),
  );

  if (alreadyApplied || !expected || !(await tableExists(client, "users"))) {
    return { checked: false, duplicates: 0 };
  }

  const duplicates = await countDuplicateNormalizedEmails(client);
  if (duplicates > 0) {
    throw new Error(
      `Preflight failed: ${duplicates} duplicate normalized primary_email group(s) exist. Resolve them before applying the unique index.`,
    );
  }
  return { checked: true, duplicates: 0 };
}

export function resolveDatabaseConfig(env = process.env) {
  const url = env.TURSO_DATABASE_URL?.trim();
  if (!url) {
    throw new Error("Set TURSO_DATABASE_URL before running migrations.");
  }
  const authToken = env.TURSO_AUTH_TOKEN?.trim() || undefined;
  if (!url.startsWith("file:") && !authToken) {
    throw new Error(
      "TURSO_AUTH_TOKEN is required for remote libSQL database URLs.",
    );
  }
  return { url, authToken };
}

/**
 * Apply all pending migrations. When `client` is provided the caller owns it;
 * otherwise a client is created from `databaseUrl`/`authToken` and closed.
 */
export async function runMigrations({
  client,
  databaseUrl,
  authToken,
  migrationsFolder = resolveMigrationsFolder(),
  log = console.log,
} = {}) {
  const ownsClient = !client;
  const dbClient =
    client ?? createClient({ url: databaseUrl, authToken: authToken });

  try {
    const migrations = readMigrationFiles({ migrationsFolder });
    const before = await readLedgerRows(dbClient);

    await preflightNormalizedEmailUniqueness(dbClient, migrationsFolder);
    await migrate(drizzle(dbClient), { migrationsFolder });

    const after = await readLedgerRows(dbClient);
    const latestHash = after.at(-1)?.hash ?? null;
    const applied = Math.max(after.length - before.length, 0);

    log(
      `Applied ${applied} of ${migrations.length} migrations (ledger ${after.length}/${migrations.length}).`,
    );
    log(`Latest migration hash: ${latestHash ?? "none"}`);

    return {
      applied,
      total: migrations.length,
      ledgerCount: after.length,
      latestHash,
    };
  } finally {
    if (ownsClient) dbClient.close();
  }
}

async function main() {
  const { url, authToken } = resolveDatabaseConfig();
  await runMigrations({ databaseUrl: url, authToken });
}

const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : null;

if (invokedPath === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(
      `Migration failed: ${error instanceof Error ? error.message : "unknown error"}`,
    );
    process.exitCode = 1;
  });
}
