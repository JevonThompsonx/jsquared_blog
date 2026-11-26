import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { authAccounts } from "@/drizzle/schema";

let tempDir: string;
let dbUrl: string;

beforeAll(async () => {
  tempDir = await mkdtemp(path.join(os.tmpdir(), "j2-workos-migration-"));
  dbUrl = `file:${path.join(tempDir, "blog.db")}`;
  const client = createClient({ url: dbUrl });
  await migrate(drizzle(client), { migrationsFolder: "drizzle" });
  client.close();
});

afterAll(async () => {
  await rm(tempDir, { recursive: true, force: true });
});

describe("WorkOS identity migration", () => {
  it("includes workos in the provider enum", () => {
    expect(authAccounts.provider.enumValues).toContain("workos");
  });

  it("adds a unique provider/subject index without dropping rollback tables", async () => {
    const client = createClient({ url: dbUrl });
    try {
      const tables = await client.execute(
        "select name from sqlite_master where type = 'table' and name in ('users', 'profiles', 'auth_accounts', 'account', 'session', 'verification')",
      );
      expect(tables.rows.map((row) => String(row.name)).sort()).toEqual([
        "account",
        "auth_accounts",
        "profiles",
        "session",
        "users",
        "verification",
      ]);

      const indexes = await client.execute("pragma index_list(auth_accounts)");
      const uniqueIndex = indexes.rows.find(
        (row) => row.name === "auth_accounts_provider_subject_unique",
      );
      expect(uniqueIndex).toBeDefined();
      const columns = await client.execute(
        `pragma index_info(${JSON.stringify(String(uniqueIndex?.name))})`,
      );
      expect(columns.rows.map((row) => String(row.name))).toEqual([
        "provider",
        "provider_user_id",
      ]);

      const now = Date.now();
      await client.execute({
        sql: "insert into users (id, primary_email, role, created_at, updated_at) values (?, ?, 'reader', ?, ?)",
        args: ["user-one", "one@example.com", now, now],
      });
      await client.execute({
        sql: "insert into users (id, primary_email, role, created_at, updated_at) values (?, ?, 'reader', ?, ?)",
        args: ["user-two", "two@example.com", now, now],
      });
      await client.execute({
        sql: "insert into auth_accounts (id, user_id, provider, provider_user_id, created_at) values (?, ?, 'workos', ?, ?)",
        args: ["account-one", "user-one", "user_workos_one", now],
      });

      await expect(
        client.execute({
          sql: "insert into auth_accounts (id, user_id, provider, provider_user_id, created_at) values (?, ?, 'workos', ?, ?)",
          args: ["account-two", "user-two", "user_workos_one", now],
        }),
      ).rejects.toThrow(/UNIQUE constraint failed/);
    } finally {
      client.close();
    }
  });
});
