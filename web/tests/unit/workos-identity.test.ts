import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";
import type { User } from "@workos-inc/node";
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

type IdentityModule = typeof import("@/server/auth/workos-identity");

let tempDir: string;
let dbUrl: string;
let client: ReturnType<typeof createClient>;
let resolveWorkosIdentity: IdentityModule["resolveWorkosIdentity"];
let WorkosIdentityError: IdentityModule["WorkosIdentityError"];

function makeUser(overrides: Partial<User> = {}): User {
  const now = new Date("2026-11-24T10:00:00.000Z");
  return {
    object: "user",
    id: "user_workos_reader",
    email: "reader@example.com",
    emailVerified: true,
    profilePictureUrl: null,
    name: "WorkOS Reader",
    firstName: "WorkOS",
    lastName: "Reader",
    lastSignInAt: now,
    locale: null,
    createdAt: now,
    updatedAt: now,
    externalId: null,
    metadata: {},
    ...overrides,
  };
}

async function insertUser(input: {
  id: string;
  email: string;
  role?: "reader" | "author" | "admin";
}) {
  const now = Date.now();
  await client.execute({
    sql: "insert into users (id, primary_email, name, email_verified, role, created_at, updated_at) values (?, ?, '', 1, ?, ?, ?)",
    args: [input.id, input.email, input.role ?? "reader", now, now],
  });
  await client.execute({
    sql: "insert into profiles (user_id, display_name, created_at, updated_at) values (?, ?, ?, ?)",
    args: [input.id, input.id, now, now],
  });
}

beforeAll(async () => {
  tempDir = await mkdtemp(path.join(os.tmpdir(), "j2-workos-identity-"));
  dbUrl = `file:${path.join(tempDir, "identity.db")}`;
  vi.stubEnv("TURSO_DATABASE_URL", dbUrl);
  vi.stubEnv("NODE_ENV", "test");
  vi.stubEnv("NEXT_PHASE", "test");
  vi.stubEnv("RATE_LIMIT_DRIVER", "memory");
  vi.doMock("@/lib/env-loader", () => ({ loadEnvironmentFiles: () => {} }));
  vi.resetModules();

  client = createClient({ url: dbUrl });
  await migrate(drizzle(client), { migrationsFolder: "drizzle" });
  ({ resolveWorkosIdentity, WorkosIdentityError } =
    await import("@/server/auth/workos-identity"));
});

beforeEach(async () => {
  await client.execute("delete from post_revisions");
  await client.execute("delete from post_preview_tokens");
  await client.execute("delete from post_images");
  await client.execute("delete from posts");
  await client.execute("delete from auth_accounts");
  await client.execute("delete from profiles");
  await client.execute("delete from users");
  await client.execute("delete from session");
  await client.execute("delete from account");
  await client.execute("delete from verification");
});

afterAll(async () => {
  client.close();
  vi.unstubAllEnvs();
  vi.resetModules();
  await rm(tempDir, { recursive: true, force: true });
});

describe("WorkOS identity mapping", () => {
  it("links an existing local user by normalized verified email and preserves content FKs", async () => {
    await insertUser({
      id: "local-author",
      email: "Author@Example.com",
      role: "author",
    });
    const now = Date.now();
    await client.execute({
      sql: "insert into posts (id, title, slug, content_json, status, author_id, created_at, updated_at) values (?, ?, ?, ?, 'published', ?, ?, ?)",
      args: ["post-one", "Story", "story", "{}", "local-author", now, now],
    });

    const mapped = await resolveWorkosIdentity(
      makeUser({ id: "user_author", email: "  AUTHOR@example.COM  " }),
    );

    expect(mapped).toMatchObject({
      id: "local-author",
      email: "Author@Example.com",
    });
    const post = await client.execute(
      "select author_id from posts where id = 'post-one'",
    );
    expect(String(post.rows[0]?.author_id)).toBe("local-author");
    const account = await client.execute(
      "select user_id, provider, provider_user_id from auth_accounts where provider = 'workos'",
    );
    expect(account.rows[0]).toMatchObject({
      user_id: "local-author",
      provider: "workos",
      provider_user_id: "user_author",
    });
  });

  it("creates a reader and profile for a new verified identity", async () => {
    const mapped = await resolveWorkosIdentity(makeUser());

    expect(mapped).toMatchObject({
      id: "workos-user-user_workos_reader",
      email: "reader@example.com",
      displayName: "WorkOS Reader",
    });
    const user = await client.execute(
      "select role, email_verified from users where id = ?",
      [mapped.id],
    );
    expect(user.rows[0]).toMatchObject({ role: "reader", email_verified: 1 });
    const profile = await client.execute(
      "select display_name from profiles where user_id = ?",
      [mapped.id],
    );
    expect(profile.rows[0]?.display_name).toBe("WorkOS Reader");
  });

  it("rejects an unverified email before reading or writing identity rows", async () => {
    await expect(
      resolveWorkosIdentity(makeUser({ emailVerified: false })),
    ).rejects.toBeInstanceOf(WorkosIdentityError);

    const users = await client.execute("select count(*) as n from users");
    const accounts = await client.execute(
      "select count(*) as n from auth_accounts",
    );
    expect(Number(users.rows[0]?.n)).toBe(0);
    expect(Number(accounts.rows[0]?.n)).toBe(0);
  });

  it("never links a synthetic legacy Supabase row", async () => {
    await insertUser({
      id: "legacy-user",
      email: "legacy@legacy.supabase.local",
    });

    await expect(
      resolveWorkosIdentity(
        makeUser({ email: "legacy@legacy.supabase.local" }),
      ),
    ).rejects.toMatchObject({ code: "legacy_email" });
    const accounts = await client.execute(
      "select count(*) as n from auth_accounts",
    );
    expect(Number(accounts.rows[0]?.n)).toBe(0);
  });

  it("rejects an invalid email", async () => {
    await expect(
      resolveWorkosIdentity(makeUser({ email: "not-an-email" })),
    ).rejects.toMatchObject({
      code: "invalid_email",
    });
  });

  it("never relinks an email already owned by another WorkOS identity", async () => {
    await resolveWorkosIdentity(
      makeUser({ id: "user_first", email: "shared@example.com" }),
    );

    await expect(
      resolveWorkosIdentity(
        makeUser({ id: "user_second", email: "shared@example.com" }),
      ),
    ).rejects.toMatchObject({ code: "identity_conflict" });

    const users = await client.execute(
      "select id from users where lower(primary_email) = 'shared@example.com'",
    );
    const accounts = await client.execute(
      "select provider_user_id from auth_accounts where provider = 'workos'",
    );
    expect(users.rows).toHaveLength(1);
    expect(accounts.rows).toHaveLength(1);
    expect(accounts.rows[0]?.provider_user_id).toBe("user_first");
  });

  it("is idempotent for the same WorkOS subject", async () => {
    const first = await resolveWorkosIdentity(makeUser());
    const second = await resolveWorkosIdentity(makeUser());

    expect(second.id).toBe(first.id);
    const users = await client.execute("select count(*) as n from users");
    const accounts = await client.execute(
      "select count(*) as n from auth_accounts",
    );
    expect(Number(users.rows[0]?.n)).toBe(1);
    expect(Number(accounts.rows[0]?.n)).toBe(1);
  });

  it("serializes concurrent first logins for the same subject", async () => {
    const results = await Promise.all([
      resolveWorkosIdentity(makeUser()),
      resolveWorkosIdentity(makeUser()),
    ]);

    expect(results[0]?.id).toBe(results[1]?.id);
    const users = await client.execute("select count(*) as n from users");
    const accounts = await client.execute(
      "select count(*) as n from auth_accounts",
    );
    expect(Number(users.rows[0]?.n)).toBe(1);
    expect(Number(accounts.rows[0]?.n)).toBe(1);
  });

  it("allows only one identity to claim an email during concurrent first logins", async () => {
    const results = await Promise.allSettled([
      resolveWorkosIdentity(
        makeUser({ id: "user_concurrent_one", email: "race@example.com" }),
      ),
      resolveWorkosIdentity(
        makeUser({ id: "user_concurrent_two", email: "race@example.com" }),
      ),
    ]);

    expect(
      results.filter((result) => result.status === "fulfilled"),
    ).toHaveLength(1);
    const rejected = results.find((result) => result.status === "rejected");
    expect(rejected).toMatchObject({ reason: { code: "identity_conflict" } });
    const users = await client.execute(
      "select count(*) as n from users where lower(primary_email) = 'race@example.com'",
    );
    expect(Number(users.rows[0]?.n)).toBe(1);
  });

  it("never promotes a demoted linked user during callback mapping", async () => {
    await insertUser({
      id: "local-reader",
      email: "reader@example.com",
      role: "reader",
    });
    await client.execute(
      "insert into auth_accounts (id, user_id, provider, provider_user_id, created_at) values ('existing-link', 'local-reader', 'workos', 'user_workos_reader', ?)",
      [Date.now()],
    );

    await resolveWorkosIdentity(makeUser(), {
      allowedEmails: ["reader@example.com"],
    });

    const user = await client.execute(
      "select role from users where id = 'local-reader'",
    );
    expect(user.rows[0]?.role).toBe("reader");
  });

  it("creates a new allowlisted WorkOS user as a reader by default", async () => {
    const mapped = await resolveWorkosIdentity(makeUser(), {
      allowedEmails: ["reader@example.com"],
    });

    const user = await client.execute("select role from users where id = ?", [
      mapped.id,
    ]);
    expect(user.rows[0]?.role).toBe("reader");
  });

  it("promotes only when explicit first-login provisioning is requested", async () => {
    await insertUser({
      id: "local-admin",
      email: "admin@example.com",
      role: "author",
    });
    await insertUser({
      id: "local-author",
      email: "author@example.com",
      role: "author",
    });

    const promoted = await resolveWorkosIdentity(
      makeUser({ id: "user_admin", email: "ADMIN@example.com" }),
      { allowedEmails: ["admin@example.com"], promoteAllowedUser: true },
    );
    const unchanged = await resolveWorkosIdentity(
      makeUser({ id: "user_author", email: "author@example.com" }),
      { allowedEmails: ["admin@example.com"] },
    );

    expect(promoted.id).toBe("local-admin");
    expect(unchanged.id).toBe("local-author");
    const roles = await client.execute(
      "select id, role from users order by id",
    );
    expect(roles.rows).toEqual([
      { id: "local-admin", role: "admin" },
      { id: "local-author", role: "author" },
    ]);
  });
});
