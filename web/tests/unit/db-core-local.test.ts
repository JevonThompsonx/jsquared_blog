import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const BASE_ENV: Record<string, string> = {
  AUTH_SECRET: "abcdefghijklmnopqrstuvwxyz123456",
  AUTH_GITHUB_ID: "github-client-id",
  AUTH_GITHUB_SECRET: "github-client-secret",
  SUPABASE_URL: "https://example.supabase.co",
  SUPABASE_ANON_KEY: "supabase-anon-key",
};

let tempDir: string;

async function importDbCore(databaseUrl: string, authToken?: string) {
  vi.resetModules();

  for (const [key, value] of Object.entries(BASE_ENV)) {
    vi.stubEnv(key, value);
  }
  vi.stubEnv("NEXT_PHASE", "test");
  vi.stubEnv("NODE_ENV", "test");
  vi.stubEnv("VERCEL", "");
  vi.stubEnv("CRON_SECRET", "1234567890abcdef");
  vi.stubEnv("TURSO_DATABASE_URL", databaseUrl);

  if (authToken === undefined) {
    delete process.env.TURSO_AUTH_TOKEN;
  } else {
    vi.stubEnv("TURSO_AUTH_TOKEN", authToken);
  }

  vi.doMock("@/lib/env-loader", () => ({ loadEnvironmentFiles: () => {} }));
  return import("@/lib/db-core");
}

describe("db-core local file database", () => {
  beforeEach(async () => {
    tempDir = await mkdtemp(path.join(os.tmpdir(), "j2-db-"));
  });

  afterEach(async () => {
    vi.unstubAllEnvs();
    vi.resetModules();
    await rm(tempDir, { recursive: true, force: true });
  });

  it("accepts a file: URL without an auth token", async () => {
    const { getDbClient } = await importDbCore(
      `file:${path.join(tempDir, "blog.db")}`,
    );

    const client = getDbClient();
    const result = await client.execute("select 1 as ok");

    expect(Number(result.rows[0]?.ok)).toBe(1);
  });

  it("reuses one client per database URL", async () => {
    const { getDbClient } = await importDbCore(
      `file:${path.join(tempDir, "blog.db")}`,
    );

    expect(getDbClient()).toBe(getDbClient());
  });

  it("applies the busy timeout to every pooled connection and keeps WAL + foreign keys on", async () => {
    const { getDbClient } = await importDbCore(
      `file:${path.join(tempDir, "blog.db")}`,
    );
    const client = getDbClient();

    const results = await Promise.all(
      Array.from({ length: 8 }, () => client.execute("PRAGMA busy_timeout")),
    );
    expect(results.map((row) => Number(row.rows[0]?.timeout))).toEqual(
      Array(8).fill(5000),
    );

    const journal = await client.execute("PRAGMA journal_mode");
    const foreignKeys = await client.execute("PRAGMA foreign_keys");

    expect(String(journal.rows[0]?.journal_mode).toLowerCase()).toBe("wal");
    expect(Number(foreignKeys.rows[0]?.foreign_keys)).toBe(1);
  });

  it("waits for an overlapping write transaction instead of failing with SQLITE_BUSY", async () => {
    const { getDbClient } = await importDbCore(
      `file:${path.join(tempDir, "blog.db")}`,
    );
    const client = getDbClient();

    await client.execute(
      "create table if not exists concurrency_probe (id integer primary key, v text)",
    );

    const first = await client.transaction("write");
    await first.execute("insert into concurrency_probe (v) values ('a')");
    const secondPromise = client.transaction("write");

    await new Promise((resolve) => setTimeout(resolve, 50));
    await first.commit();

    const second = await secondPromise;
    await second.execute("insert into concurrency_probe (v) values ('b')");
    await second.commit();

    const rows = await client.execute(
      "select count(*) as n from concurrency_probe",
    );
    expect(Number(rows.rows[0]?.n)).toBe(2);
  });

  it("still requires an auth token for a remote libsql URL", async () => {
    const { getDbClient } = await importDbCore("libsql://example.turso.io");

    expect(() => getDbClient()).toThrow(/TURSO_AUTH_TOKEN/i);
  });

  it("drops the cache when reset for tests", async () => {
    const { getDbClient, resetDbClientForTests } = await importDbCore(
      `file:${path.join(tempDir, "blog.db")}`,
    );

    const first = getDbClient();
    resetDbClientForTests();
    expect(getDbClient()).not.toBe(first);
  });
});
