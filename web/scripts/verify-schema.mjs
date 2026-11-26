#!/usr/bin/env node
/**
 * Verify that the live SQLite/libSQL schema matches the latest Drizzle
 * snapshot and that the migration ledger hashes match the committed files.
 *
 * Usage:
 *   TURSO_DATABASE_URL=file:/srv/blog/shared/blog.db node scripts/verify-schema.mjs
 *
 * Output lists counts and object names only; it never prints SQL, the database
 * URL, or credentials.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { createClient } from "@libsql/client";
import { readMigrationFiles } from "drizzle-orm/migrator";

import {
  readLedgerRows,
  resolveDatabaseConfig,
  resolveMigrationsFolder,
} from "./migrate-database.mjs";

const IDENTIFIER = /^[A-Za-z0-9_]+$/;

function quoteIdentifier(value) {
  if (!IDENTIFIER.test(value)) {
    throw new Error("Refusing to query an unexpected SQLite identifier.");
  }
  return `"${value}"`;
}

function isPlainColumn(column) {
  return typeof column === "string" && IDENTIFIER.test(column.trim());
}

export function loadLatestSnapshot(
  migrationsFolder = resolveMigrationsFolder(),
) {
  const journalPath = path.join(migrationsFolder, "meta", "_journal.json");
  const journal = JSON.parse(fs.readFileSync(journalPath, "utf8"));
  const latest = journal.entries.at(-1);
  if (!latest) {
    throw new Error("Migration journal has no entries.");
  }
  // Drizzle names snapshots by journal index, not by migration tag:
  // `meta/0025_snapshot.json` for the entry tagged `0025_workos_identity`.
  const snapshotPath = path.join(
    migrationsFolder,
    "meta",
    `${String(latest.idx).padStart(4, "0")}_snapshot.json`,
  );
  if (!fs.existsSync(snapshotPath)) {
    throw new Error(`Missing snapshot for ${latest.tag}.`);
  }
  return {
    tag: latest.tag,
    snapshot: JSON.parse(fs.readFileSync(snapshotPath, "utf8")),
  };
}

export async function readDatabaseSchema(client) {
  const tableResult = await client.execute(
    "select name from sqlite_master where type = 'table' and name not like 'sqlite_%' and name != '__drizzle_migrations' order by name",
  );

  const tables = {};
  const indexesByName = {};

  for (const row of tableResult.rows) {
    const table = String(row.name);
    const tableInfo = await client.execute(
      `pragma table_info(${quoteIdentifier(table)})`,
    );
    const columns = tableInfo.rows.map((column) => String(column.name));
    const indexes = {};

    const indexList = await client.execute(
      `pragma index_list(${quoteIdentifier(table)})`,
    );
    for (const index of indexList.rows) {
      const indexName = String(index.name);
      if (indexName.startsWith("sqlite_autoindex_")) continue;

      const indexInfo = await client.execute(
        `pragma index_info(${quoteIdentifier(indexName)})`,
      );
      indexes[indexName] = {
        columns: indexInfo.rows.map((column) =>
          column.name === null ? null : String(column.name),
        ),
        unique: Number(index.unique) === 1,
      };
      indexesByName[indexName] = { table, ...indexes[indexName] };
    }

    tables[table] = { columns, indexes };
  }

  return {
    tables,
    indexesByName,
    tableCount: Object.keys(tables).length,
    indexCount: Object.keys(indexesByName).length,
  };
}

function columnsMatch(expectedColumns, actualColumns) {
  if (expectedColumns.some((column) => !isPlainColumn(column))) {
    // Expression indexes (for example lower(primary_email)) are identified by
    // name and uniqueness; PRAGMA index_info reports no usable column name.
    return true;
  }
  if (expectedColumns.length !== actualColumns.length) return false;
  return expectedColumns.every(
    (column, index) => column.trim() === actualColumns[index],
  );
}

export function compareDatabaseToSnapshot(snapshot, actual) {
  const expectedTables = snapshot.tables ?? {};
  const missingTables = [];
  const missingColumns = [];
  const missingIndexes = [];
  const mismatchedIndexes = [];

  for (const [tableName, tableDef] of Object.entries(expectedTables)) {
    const actualTable = actual.tables[tableName];
    if (!actualTable) {
      missingTables.push(tableName);
      continue;
    }

    for (const column of Object.keys(tableDef.columns ?? {})) {
      if (!actualTable.columns.includes(column)) {
        missingColumns.push(`${tableName}.${column}`);
      }
    }

    for (const [indexName, indexDef] of Object.entries(
      tableDef.indexes ?? {},
    )) {
      const actualIndex = actual.indexesByName[indexName];
      if (!actualIndex || actualIndex.table !== tableName) {
        missingIndexes.push(indexName);
        continue;
      }
      const expectedUnique = Boolean(indexDef.isUnique);
      if (
        expectedUnique !== actualIndex.unique ||
        !columnsMatch(indexDef.columns ?? [], actualIndex.columns)
      ) {
        mismatchedIndexes.push(indexName);
      }
    }
  }

  const extraTables = Object.keys(actual.tables).filter(
    (table) => !(table in expectedTables),
  );

  return {
    missingTables,
    missingColumns,
    missingIndexes,
    mismatchedIndexes,
    extraTables,
  };
}

export async function verifySchema({
  client,
  migrationsFolder = resolveMigrationsFolder(),
}) {
  const { tag, snapshot } = loadLatestSnapshot(migrationsFolder);
  const migrations = readMigrationFiles({ migrationsFolder });
  const ledger = await readLedgerRows(client);
  const actual = await readDatabaseSchema(client);
  const comparison = compareDatabaseToSnapshot(snapshot, actual);

  const expectedHashes = new Set(migrations.map((entry) => entry.hash));
  const ledgerHashes = new Set(ledger.map((row) => row.hash));
  const ledgerHashMismatches = ledger.filter(
    (row) => !expectedHashes.has(row.hash),
  ).length;
  const missingLedgerHashes = migrations.filter(
    (entry) => !ledgerHashes.has(entry.hash),
  ).length;

  const ok =
    comparison.missingTables.length === 0 &&
    comparison.missingColumns.length === 0 &&
    comparison.missingIndexes.length === 0 &&
    comparison.mismatchedIndexes.length === 0 &&
    comparison.extraTables.length === 0 &&
    ledgerHashMismatches === 0 &&
    missingLedgerHashes === 0 &&
    ledger.length === migrations.length;

  return {
    ok,
    snapshot: tag,
    migrationCount: migrations.length,
    ledgerCount: ledger.length,
    ledgerHashMismatches,
    missingLedgerHashes,
    tableCount: actual.tableCount,
    indexCount: actual.indexCount,
    ...comparison,
  };
}

function formatList(label, values) {
  if (values.length === 0) return `  ${label}: none`;
  return `  ${label} (${values.length}): ${values.join(", ")}`;
}

export async function main() {
  const { url, authToken } = resolveDatabaseConfig();
  const client = createClient({ url, authToken });

  try {
    const report = await verifySchema({ client });
    console.log(`Snapshot: ${report.snapshot}`);
    console.log(
      `Ledger: ${report.ledgerCount}/${report.migrationCount} rows (${report.ledgerHashMismatches} hash mismatches, ${report.missingLedgerHashes} missing)`,
    );
    console.log(
      `Schema: ${report.tableCount} tables, ${report.indexCount} indexes`,
    );
    console.log(formatList("Missing tables", report.missingTables));
    console.log(formatList("Missing columns", report.missingColumns));
    console.log(formatList("Missing indexes", report.missingIndexes));
    console.log(formatList("Mismatched indexes", report.mismatchedIndexes));
    console.log(formatList("Extra tables", report.extraTables));
    console.log(
      report.ok ? "Schema verification passed." : "Schema verification failed.",
    );

    if (!report.ok) {
      process.exitCode = 1;
    }
    return report;
  } finally {
    client.close();
  }
}

const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : null;

if (invokedPath === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(
      `Schema verification failed: ${error instanceof Error ? error.message : "unknown error"}`,
    );
    process.exitCode = 1;
  });
}
