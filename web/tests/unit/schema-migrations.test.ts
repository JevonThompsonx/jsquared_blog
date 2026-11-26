import { readFileSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { createClient, type Client } from "@libsql/client";
import { afterAll, describe, expect, it } from "vitest";

import {
  preflightNormalizedEmailUniqueness,
  runMigrations,
} from "../../scripts/migrate-database.mjs";
import { reconcileMigrationLedger } from "../../scripts/reconcile-migration-ledger.mjs";
import { verifySchema } from "../../scripts/verify-schema.mjs";

const migrationsFolder = path.resolve(process.cwd(), "drizzle");

const tempDirs: string[] = [];
const clients: Client[] = [];

async function freshDb(): Promise<Client> {
  const dir = await mkdtemp(path.join(os.tmpdir(), "j2-schema-migrations-"));
  tempDirs.push(dir);
  const client = createClient({ url: `file:${path.join(dir, "test.db")}` });
  clients.push(client);
  return client;
}

async function migratedDb(): Promise<Client> {
  const client = await freshDb();
  await runMigrations({
    client,
    migrationsFolder,
    log: () => {},
  });
  return client;
}

async function ledgerRows(client: Client) {
  const result = await client.execute(
    "select hash, created_at from __drizzle_migrations order by created_at asc",
  );
  return result.rows.map((row) => ({
    hash: String(row.hash),
    createdAt: Number(row.created_at),
  }));
}

/**
 * Copy the migration folder with the journal truncated to `maxIdx`. Used to
 * reproduce a database that predates a later migration.
 */
async function truncatedMigrationsFolder(maxIdx: number): Promise<string> {
  const { cp, readFile, readdir, writeFile } = await import("node:fs/promises");
  const root = await mkdtemp(path.join(os.tmpdir(), "j2-migrations-"));
  tempDirs.push(root);
  const target = path.join(root, "drizzle");
  await cp(migrationsFolder, target, { recursive: true });
  const journalPath = path.join(target, "meta", "_journal.json");
  const journal = JSON.parse(await readFile(journalPath, "utf8")) as {
    entries: { idx: number; tag: string }[];
  };
  journal.entries = journal.entries.filter((entry) => entry.idx <= maxIdx);
  await writeFile(journalPath, JSON.stringify(journal, null, 2));
  for (const name of await readdir(target)) {
    const match = /^(\d{4})_.*\.sql$/.exec(name);
    if (match && Number(match[1]) > maxIdx) {
      await rm(path.join(target, name));
    }
  }
  for (const name of await readdir(path.join(target, "meta"))) {
    const match = /^(\d{4})_snapshot\.json$/.exec(name);
    if (match && Number(match[1]) > maxIdx) {
      await rm(path.join(target, "meta", name));
    }
  }
  return target;
}

async function insertUser(client: Client, id: string, email: string) {
  const now = Date.now();
  await client.execute({
    sql: "insert into users (id, primary_email, created_at, updated_at) values (?, ?, ?, ?)",
    args: [id, email, now, now],
  });
}

afterAll(async () => {
  for (const client of clients) {
    client.close();
  }
  await Promise.all(
    tempDirs.map((dir) => rm(dir, { recursive: true, force: true })),
  );
});

describe("runMigrations", () => {
  it("applies every migration to an empty database and records the latest hash", async () => {
    const client = await freshDb();

    const result = await runMigrations({
      client,
      migrationsFolder,
      log: () => {},
    });

    expect(result.applied).toBe(result.total);
    expect(result.ledgerCount).toBe(result.total);
    expect(result.latestHash).toMatch(/^[a-f0-9]{64}$/);

    const rows = await ledgerRows(client);
    expect(rows).toHaveLength(result.total);
    expect(rows.at(-1)?.hash).toBe(result.latestHash);
  });

  it("is a no-op on an already migrated database", async () => {
    const client = await migratedDb();

    const result = await runMigrations({
      client,
      migrationsFolder,
      log: () => {},
    });

    expect(result.applied).toBe(0);
    expect(result.ledgerCount).toBe(result.total);
  });
});

describe("verifySchema", () => {
  it("reports a healthy database that matches the latest snapshot", async () => {
    const client = await migratedDb();

    const report = await verifySchema({ client, migrationsFolder });

    expect(report.ok).toBe(true);
    expect(report.ledgerCount).toBe(report.migrationCount);
    expect(report.missingTables).toEqual([]);
    expect(report.missingColumns).toEqual([]);
    expect(report.missingIndexes).toEqual([]);
    expect(report.ledgerHashMismatches).toBe(0);
    expect(report.tableCount).toBeGreaterThan(0);
    expect(report.indexCount).toBeGreaterThan(0);
  });

  it("detects a missing critical index without leaking SQL text", async () => {
    const client = await migratedDb();
    await client.execute("drop index auth_accounts_provider_subject_unique");

    const report = await verifySchema({ client, migrationsFolder });

    expect(report.ok).toBe(false);
    expect(report.missingIndexes).toContain(
      "auth_accounts_provider_subject_unique",
    );
    expect(JSON.stringify(report)).not.toContain("CREATE UNIQUE INDEX");
  });

  it("detects a missing column", async () => {
    const client = await migratedDb();
    await client.execute("alter table users drop column image");

    const report = await verifySchema({ client, migrationsFolder });

    expect(report.ok).toBe(false);
    expect(report.missingColumns).toContain("users.image");
  });

  it("detects an unexpected extra table", async () => {
    const client = await migratedDb();
    await client.execute("create table leftover_manual_fix (id integer)");

    const report = await verifySchema({ client, migrationsFolder });

    expect(report.ok).toBe(false);
    expect(report.extraTables).toContain("leftover_manual_fix");
  });

  it("detects a ledger hash that no longer matches its migration file", async () => {
    const client = await migratedDb();
    const rows = await ledgerRows(client);
    await client.execute({
      sql: "update __drizzle_migrations set hash = ? where created_at = ?",
      args: ["0".repeat(64), rows[0].createdAt],
    });

    const report = await verifySchema({ client, migrationsFolder });

    expect(report.ok).toBe(false);
    expect(report.ledgerHashMismatches).toBeGreaterThan(0);
    expect(JSON.stringify(report)).not.toContain("0".repeat(64));
  });
});

describe("reconcileMigrationLedger", () => {
  it("reports legacy and missing ledger rows without writing in dry-run mode", async () => {
    const client = await migratedDb();
    const rows = await ledgerRows(client);
    const missing = rows.at(-1)!;
    const legacy = rows[1];
    await client.execute({
      sql: "delete from __drizzle_migrations where created_at = ?",
      args: [missing.createdAt],
    });
    await client.execute({
      sql: "update __drizzle_migrations set hash = ? where created_at = ?",
      args: ["f".repeat(64), legacy.createdAt],
    });

    const before = await ledgerRows(client);
    const report = await reconcileMigrationLedger({
      client,
      migrationsFolder,
    });
    const after = await ledgerRows(client);

    expect(report.ok).toBe(true);
    expect(report.applied).toBe(false);
    expect(report.legacyHashes).toHaveLength(1);
    expect(report.missingRows).toHaveLength(1);
    expect(after).toEqual(before);
  });

  it("repairs legacy hashes and missing rows only when --apply is set", async () => {
    const client = await migratedDb();
    const rows = await ledgerRows(client);
    await client.execute({
      sql: "delete from __drizzle_migrations where created_at = ?",
      args: [rows.at(-1)!.createdAt],
    });
    await client.execute({
      sql: "update __drizzle_migrations set hash = ? where created_at = ?",
      args: ["f".repeat(64), rows[1].createdAt],
    });

    const report = await reconcileMigrationLedger({
      client,
      migrationsFolder,
      apply: true,
    });

    expect(report.ok).toBe(true);
    expect(report.applied).toBe(true);
    expect(report.updatedHashes).toBe(1);
    expect(report.insertedRows).toBe(1);

    const verified = await verifySchema({ client, migrationsFolder });
    expect(verified.ok).toBe(true);
  });

  it("refuses to reconcile a migration with unverifiable DML unless explicitly allowed", async () => {
    const client = await migratedDb();
    const journal = JSON.parse(
      readFileSync(
        path.join(migrationsFolder, "meta", "_journal.json"),
        "utf8",
      ),
    ) as { entries: { tag: string; when: number }[] };
    const dmlEntry = journal.entries.find(
      (entry) => entry.tag === "0005_post_content_and_preview_tokens",
    );
    expect(dmlEntry).toBeDefined();

    const rows = await ledgerRows(client);
    const target = rows.find((row) => row.createdAt === dmlEntry!.when);
    expect(target).toBeDefined();
    await client.execute({
      sql: "delete from __drizzle_migrations where created_at = ?",
      args: [target!.createdAt],
    });
    const before = await ledgerRows(client);

    const blocked = await reconcileMigrationLedger({
      client,
      migrationsFolder,
      apply: true,
    });

    expect(blocked.ok).toBe(false);
    expect(blocked.applied).toBe(false);
    expect(blocked.unverifiableStatements).toBeGreaterThan(0);
    expect(blocked.unverifiableMigrations).toContain(
      "0005_post_content_and_preview_tokens",
    );
    expect(await ledgerRows(client)).toEqual(before);

    const allowed = await reconcileMigrationLedger({
      client,
      migrationsFolder,
      apply: true,
      allowUnverifiable: true,
    });

    expect(allowed.ok).toBe(true);
    expect(allowed.applied).toBe(true);
    expect(allowed.insertedRows).toBe(1);
    expect((await verifySchema({ client, migrationsFolder })).ok).toBe(true);
  });

  it("aborts without any writes when a migration effect is missing", async () => {
    const client = await migratedDb();
    const rows = await ledgerRows(client);
    // 0025 adds the auth_accounts provider/subject unique index.
    const workosRow = rows.find((row) => row.createdAt === 1795531223965);
    expect(workosRow).toBeDefined();
    await client.execute({
      sql: "delete from __drizzle_migrations where created_at = ?",
      args: [workosRow!.createdAt],
    });
    await client.execute("drop index auth_accounts_provider_subject_unique");
    const before = await ledgerRows(client);

    const report = await reconcileMigrationLedger({
      client,
      migrationsFolder,
      apply: true,
    });

    expect(report.ok).toBe(false);
    expect(report.applied).toBe(false);
    expect(report.missingEffects).toContain(
      "index:auth_accounts_provider_subject_unique",
    );
    expect(await ledgerRows(client)).toEqual(before);
  });
});

describe("case-insensitive primary email uniqueness", () => {
  it("rejects a second account whose email differs only by case", async () => {
    const client = await migratedDb();
    await insertUser(client, "user-1", "Case@Example.com");

    await expect(
      insertUser(client, "user-2", "case@example.com"),
    ).rejects.toThrow(/UNIQUE/i);
  });

  it("preflights duplicate normalized emails before the index exists", async () => {
    const client = await freshDb();
    const folder = await truncatedMigrationsFolder(25);
    await runMigrations({ client, migrationsFolder: folder, log: () => {} });
    await insertUser(client, "user-1", "Dup@Example.com");
    await insertUser(client, "user-2", "dup@example.com");

    await expect(
      preflightNormalizedEmailUniqueness(client, migrationsFolder),
    ).rejects.toThrow(/duplicate/i);
  });

  it("passes the preflight when normalized emails are unique", async () => {
    const client = await freshDb();
    const folder = await truncatedMigrationsFolder(25);
    await runMigrations({ client, migrationsFolder: folder, log: () => {} });
    await insertUser(client, "user-1", "one@example.com");
    await insertUser(client, "user-2", "two@example.com");

    await expect(
      preflightNormalizedEmailUniqueness(client, migrationsFolder),
    ).resolves.toMatchObject({ checked: true, duplicates: 0 });
  });
});
