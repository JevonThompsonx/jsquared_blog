#!/usr/bin/env node
/**
 * One-time migration ledger reconciliation.
 *
 * Usage:
 *   TURSO_DATABASE_URL=file:/srv/blog/shared/blog.db node scripts/reconcile-migration-ledger.mjs
 *   TURSO_DATABASE_URL=file:/srv/blog/shared/blog.db node scripts/reconcile-migration-ledger.mjs --apply
 *
 * Without `--apply` this is a read-only dry run. It never rewrites migration
 * rows until every observable effect of every pending migration is present in
 * the database. DDL effects are checked against `sqlite_master`; migrations with
 * DML/PRAGMA statements cannot be proven that way and abort the repair unless
 * `--allow-unverifiable` is passed explicitly. On any missing effect it aborts
 * without writing.
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
import { loadLatestSnapshot, readDatabaseSchema } from "./verify-schema.mjs";

function stripSqlComments(statement) {
  return statement
    .split("\n")
    .filter((line) => !line.trim().startsWith("--"))
    .join("\n")
    .trim();
}

function splitTopLevel(value) {
  const parts = [];
  let depth = 0;
  let current = "";
  for (const character of value) {
    if (character === "(") depth += 1;
    if (character === ")") depth -= 1;
    if (character === "," && depth === 0) {
      parts.push(current);
      current = "";
      continue;
    }
    current += character;
  }
  if (current.trim()) parts.push(current);
  return parts;
}

function cleanIdentifier(value) {
  return value
    .trim()
    .replace(/^[`"[]/, "")
    .replace(/[`"\]]$/, "");
}

function columnNames(body) {
  return splitTopLevel(body)
    .map((part) => part.trim())
    .filter((part) => part.length > 0)
    .filter(
      (part) => !/^(?:CONSTRAINT|PRIMARY|FOREIGN|UNIQUE|CHECK)\b/i.test(part),
    )
    .map((part) => cleanIdentifier(part.split(/\s+/)[0] ?? ""))
    .filter(Boolean);
}

/**
 * Extract the durable structural effects of one migration: the tables and
 * columns it creates or adds, and the indexes it creates. Statements that only
 * move data are counted as unverifiable.
 */
export function extractMigrationEffects(statements) {
  const tables = new Map();
  const indexes = new Map();
  let unverifiableStatements = 0;

  for (const statement of statements) {
    const sql = stripSqlComments(statement);
    if (!sql) continue;

    const createTable = sql.match(
      /^CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?([`"[]?[A-Za-z0-9_]+[`"\]]?)\s*\(/i,
    );
    if (createTable) {
      const name = cleanIdentifier(createTable[1]);
      const bodyStart = sql.indexOf(
        "(",
        createTable.index + createTable[0].length - 1,
      );
      const bodyEnd = sql.lastIndexOf(")");
      tables.set(
        name,
        bodyStart >= 0 && bodyEnd > bodyStart
          ? columnNames(sql.slice(bodyStart + 1, bodyEnd))
          : [],
      );
      continue;
    }

    const createIndex = sql.match(
      /^CREATE\s+(UNIQUE\s+)?INDEX\s+(?:IF\s+NOT\s+EXISTS\s+)?([`"[]?[A-Za-z0-9_]+[`"\]]?)\s+ON\s+([`"[]?[A-Za-z0-9_]+[`"\]]?)\s*\(([\s\S]*)\)\s*;?\s*$/i,
    );
    if (createIndex) {
      const name = cleanIdentifier(createIndex[2]);
      const table = cleanIdentifier(createIndex[3]);
      indexes.set(name, {
        table,
        unique: Boolean(createIndex[1]),
        columns: splitTopLevel(createIndex[4]).map((column) =>
          cleanIdentifier(column),
        ),
      });
      continue;
    }

    const dropTable = sql.match(
      /^DROP\s+TABLE\s+(?:IF\s+EXISTS\s+)?([`"[]?[A-Za-z0-9_]+[`"\]]?)/i,
    );
    if (dropTable) {
      tables.delete(cleanIdentifier(dropTable[1]));
      continue;
    }

    const renameTable = sql.match(
      /^ALTER\s+TABLE\s+([`"[]?[A-Za-z0-9_]+[`"\]]?)\s+RENAME\s+TO\s+([`"[]?[A-Za-z0-9_]+[`"\]]?)/i,
    );
    if (renameTable) {
      const from = cleanIdentifier(renameTable[1]);
      const to = cleanIdentifier(renameTable[2]);
      const columns = tables.get(from);
      if (columns) {
        tables.delete(from);
        tables.set(to, columns);
      }
      for (const [name, def] of indexes) {
        if (def.table === from) def.table = to;
      }
      continue;
    }

    const addColumn = sql.match(
      /^ALTER\s+TABLE\s+([`"[]?[A-Za-z0-9_]+[`"\]]?)\s+ADD\s+(?:COLUMN\s+)?([`"[]?[A-Za-z0-9_]+[`"\]]?)/i,
    );
    if (addColumn) {
      const table = cleanIdentifier(addColumn[1]);
      const column = cleanIdentifier(addColumn[2]);
      const columns = tables.get(table) ?? [];
      if (!columns.includes(column)) columns.push(column);
      tables.set(table, columns);
      continue;
    }

    if (
      /^(?:INSERT|UPDATE|DELETE|PRAGMA|SELECT|CREATE\s+TRIGGER)\b/i.test(sql)
    ) {
      unverifiableStatements += 1;
    }
  }

  return { tables, indexes, unverifiableStatements };
}

function isPlainColumn(column) {
  return /^[A-Za-z0-9_]+$/.test(column.trim());
}

/**
 * Check the extracted effects against the live database, but only for objects
 * that still exist in the latest snapshot. An object a later migration
 * intentionally removed cannot be observed today and is not evidence of a
 * missing effect.
 */
export async function findMissingEffects(client, effects, snapshot) {
  const expectedTables = snapshot.tables ?? {};
  const actual = await readDatabaseSchema(client);
  const missing = [];

  for (const [table, columns] of effects.tables) {
    const expectedTable = expectedTables[table];
    if (!expectedTable) continue;
    const actualTable = actual.tables[table];
    if (!actualTable) {
      missing.push(`table:${table}`);
      continue;
    }
    for (const column of columns) {
      if (!(column in (expectedTable.columns ?? {}))) continue;
      if (!actualTable.columns.includes(column)) {
        missing.push(`column:${table}.${column}`);
      }
    }
  }

  for (const [indexName, def] of effects.indexes) {
    const expectedIndex = expectedTables[def.table]?.indexes?.[indexName];
    if (!expectedIndex) continue;
    const actualIndex = actual.indexesByName[indexName];
    if (!actualIndex) {
      missing.push(`index:${indexName}`);
      continue;
    }
    const expectedUnique = Boolean(expectedIndex.isUnique);
    if (expectedUnique !== actualIndex.unique) {
      missing.push(`index:${indexName}`);
      continue;
    }
    const expectedColumns = def.columns.filter(Boolean);
    if (
      expectedColumns.length > 0 &&
      expectedColumns.every(isPlainColumn) &&
      expectedColumns.join(",") !==
        actualIndex.columns.filter(Boolean).join(",")
    ) {
      missing.push(`index:${indexName}`);
    }
  }

  return missing;
}

function readJournal(migrationsFolder) {
  return JSON.parse(
    fs.readFileSync(
      path.join(migrationsFolder, "meta", "_journal.json"),
      "utf8",
    ),
  );
}

async function ledgerTableExists(client) {
  const result = await client.execute(
    "select count(*) as n from sqlite_master where type = 'table' and name = '__drizzle_migrations'",
  );
  return Number(result.rows[0]?.n ?? 0) > 0;
}

/**
 * Pair committed migrations with ledger rows by exact hash first, then by
 * folder timestamp. A row whose timestamp matches but whose hash differs is a
 * legacy hash; a migration with neither is a missing row.
 */
export async function reconcileMigrationLedger({
  client,
  migrationsFolder = resolveMigrationsFolder(),
  apply = false,
  allowUnverifiable = false,
}) {
  const journal = readJournal(migrationsFolder);
  const migrations = readMigrationFiles({ migrationsFolder });
  const { snapshot } = loadLatestSnapshot(migrationsFolder);
  const ledger = await readLedgerRows(client);

  const available = ledger.map((row) => ({ ...row, used: false }));
  const legacy = [];
  const missing = [];

  for (let index = 0; index < migrations.length; index += 1) {
    const migration = migrations[index];
    const tag = journal.entries[index]?.tag ?? `entry_${index}`;

    const exact = available.find(
      (row) => !row.used && row.hash === migration.hash,
    );
    if (exact) {
      exact.used = true;
      continue;
    }

    const sameTimestamp = available.find(
      (row) => !row.used && row.createdAt === migration.folderMillis,
    );
    if (sameTimestamp) {
      sameTimestamp.used = true;
      legacy.push({
        tag,
        rowid: sameTimestamp.rowid,
        fromHash: sameTimestamp.hash,
        toHash: migration.hash,
        createdAt: migration.folderMillis,
        sql: migration.sql,
      });
      continue;
    }

    missing.push({
      tag,
      hash: migration.hash,
      createdAt: migration.folderMillis,
      sql: migration.sql,
    });
  }

  const orphanRows = available.filter((row) => !row.used);

  const missingEffects = [];
  const unverifiable = [];
  for (const entry of [...legacy, ...missing]) {
    const effects = extractMigrationEffects(entry.sql);
    if (effects.unverifiableStatements > 0) {
      unverifiable.push({
        tag: entry.tag,
        count: effects.unverifiableStatements,
      });
    }
    const found = await findMissingEffects(client, effects, snapshot);
    for (const effect of found) {
      if (!missingEffects.includes(effect)) missingEffects.push(effect);
    }
  }

  const unverifiableStatements = unverifiable.reduce(
    (total, entry) => total + entry.count,
    0,
  );
  const unverifiableBlocked = unverifiable.length > 0 && !allowUnverifiable;

  const report = {
    ok:
      missingEffects.length === 0 &&
      orphanRows.length === 0 &&
      !unverifiableBlocked,
    applied: false,
    checked: migrations.length,
    legacyHashes: legacy.map((entry) => entry.tag),
    missingRows: missing.map((entry) => entry.tag),
    orphanRows: orphanRows.length,
    missingEffects,
    unverifiableMigrations: unverifiable.map((entry) => entry.tag),
    unverifiableStatements,
    updatedHashes: 0,
    insertedRows: 0,
  };

  if (!report.ok || !apply || legacy.length + missing.length === 0) {
    return report;
  }

  if (!(await ledgerTableExists(client))) {
    throw new Error(
      "The migration ledger table does not exist; run db:migrate:node first.",
    );
  }

  const transaction = await client.transaction("write");
  try {
    for (const entry of legacy) {
      await transaction.execute({
        sql: "update __drizzle_migrations set hash = ? where rowid = ?",
        args: [entry.toHash, entry.rowid],
      });
    }
    for (const entry of missing) {
      await transaction.execute({
        sql: "insert into __drizzle_migrations (hash, created_at) values (?, ?)",
        args: [entry.hash, entry.createdAt],
      });
    }
    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
    throw error;
  }

  return {
    ...report,
    applied: true,
    updatedHashes: legacy.length,
    insertedRows: missing.length,
  };
}

export async function main(argv = process.argv.slice(2)) {
  const apply = argv.includes("--apply");
  const allowUnverifiable = argv.includes("--allow-unverifiable");
  const { url, authToken } = resolveDatabaseConfig();
  const client = createClient({ url, authToken });

  try {
    const report = await reconcileMigrationLedger({
      client,
      apply,
      allowUnverifiable,
    });
    console.log(
      `Ledger: ${report.checked} migrations checked; ${report.legacyHashes.length} legacy hash(es), ${report.missingRows.length} missing row(s), ${report.orphanRows} orphan row(s).`,
    );
    if (report.legacyHashes.length > 0) {
      console.log(`  Legacy hashes: ${report.legacyHashes.join(", ")}`);
    }
    if (report.missingRows.length > 0) {
      console.log(`  Missing rows: ${report.missingRows.join(", ")}`);
    }
    if (report.unverifiableMigrations.length > 0) {
      console.log(
        `  Unverifiable statements (${report.unverifiableStatements}) in: ${report.unverifiableMigrations.join(", ")}. DDL effects are checked; DML/PRAGMA effects cannot be proven from sqlite_master.`,
      );
    }
    if (!report.ok) {
      if (report.missingEffects.length > 0) {
        console.log(
          `  Missing effects (${report.missingEffects.length}): ${report.missingEffects.join(", ")}`,
        );
      }
      console.log("Reconciliation aborted; no rows were written.");
      process.exitCode = 1;
      return report;
    }
    if (!apply) {
      console.log("Dry run only; re-run with --apply to write the ledger.");
      return report;
    }
    console.log(
      `Reconciled ledger: ${report.updatedHashes} hash(es) updated, ${report.insertedRows} row(s) inserted.`,
    );
    return report;
  } finally {
    client.close();
  }
}

const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : null;

if (invokedPath === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(
      `Ledger reconciliation failed: ${error instanceof Error ? error.message : "unknown error"}`,
    );
    process.exitCode = 1;
  });
}
