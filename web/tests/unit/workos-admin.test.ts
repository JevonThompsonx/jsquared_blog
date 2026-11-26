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

const { withAuthMock, checkRecentAuthMock, captureExceptionMock } = vi.hoisted(
  () => ({
    withAuthMock: vi.fn(),
    checkRecentAuthMock: vi.fn(),
    captureExceptionMock: vi.fn(),
  }),
);

vi.mock("@workos-inc/authkit-nextjs", () => ({
  withAuth: withAuthMock,
  checkRecentAuth: checkRecentAuthMock,
}));

vi.mock("@/lib/sentry", () => ({
  captureException: captureExceptionMock,
}));

type AdminModule = typeof import("@/server/auth/workos-admin");

let tempDir: string;
let client: ReturnType<typeof createClient>;
let getWorkosAdminSession: AdminModule["getWorkosAdminSession"];
let getWorkosAdminAccessState: AdminModule["getWorkosAdminAccessState"];

const syntheticAdminEmails = [
  "admin1@example.com",
  "admin2@example.com",
  "admin3@example.com",
  "admin4@example.com",
  "admin5@example.com",
];

function makeUser(overrides: Partial<User> = {}): User {
  const now = new Date("2026-11-24T10:00:00.000Z");
  return {
    object: "user",
    id: "user_workos_admin",
    email: "admin@example.com",
    emailVerified: true,
    profilePictureUrl: null,
    name: "WorkOS Admin",
    firstName: "WorkOS",
    lastName: "Admin",
    lastSignInAt: now,
    locale: null,
    createdAt: now,
    updatedAt: now,
    externalId: null,
    metadata: {},
    ...overrides,
  };
}

async function insertUser(
  role: "reader" | "author" | "admin",
  email = "admin@example.com",
) {
  const now = Date.now();
  await client.execute({
    sql: "insert into users (id, primary_email, email_verified, role, created_at, updated_at) values ('local-admin', ?, 1, ?, ?, ?)",
    args: [email, role, now, now],
  });
  await client.execute({
    sql: "insert into profiles (user_id, display_name, created_at, updated_at) values ('local-admin', 'Local Admin', ?, ?)",
    args: [now, now],
  });
}

beforeAll(async () => {
  tempDir = await mkdtemp(path.join(os.tmpdir(), "j2-workos-admin-"));
  const dbUrl = `file:${path.join(tempDir, "admin.db")}`;
  vi.stubEnv("TURSO_DATABASE_URL", dbUrl);
  vi.stubEnv("ADMIN_ALLOWED_EMAILS", " Admin@Example.com ");
  vi.stubEnv("NODE_ENV", "test");
  vi.stubEnv("NEXT_PHASE", "test");
  vi.stubEnv("RATE_LIMIT_DRIVER", "memory");
  vi.doMock("@/lib/env-loader", () => ({ loadEnvironmentFiles: () => {} }));
  vi.resetModules();

  client = createClient({ url: dbUrl });
  await migrate(drizzle(client), { migrationsFolder: "drizzle" });
  ({ getWorkosAdminSession, getWorkosAdminAccessState } =
    await import("@/server/auth/workos-admin"));
});

beforeEach(async () => {
  await client.execute("delete from auth_accounts");
  await client.execute("delete from profiles");
  await client.execute("delete from users");
  vi.stubEnv("ADMIN_ALLOWED_EMAILS", " Admin@Example.com ");
  withAuthMock.mockReset();
  withAuthMock.mockResolvedValue({
    user: makeUser(),
    sessionId: "session_1",
    accessToken: "token",
  });
  checkRecentAuthMock.mockReset();
  checkRecentAuthMock.mockResolvedValue({ isStale: false });
});

afterAll(async () => {
  client.close();
  vi.unstubAllEnvs();
  vi.resetModules();
  await rm(tempDir, { recursive: true, force: true });
});

describe("WorkOS admin authorization", () => {
  it("allows only a verified, allowlisted, recent local admin", async () => {
    await insertUser("admin");

    const session = await getWorkosAdminSession();

    expect(session?.user).toMatchObject({
      id: "local-admin",
      role: "admin",
      email: "admin@example.com",
      name: "WorkOS Admin",
    });
    expect(await getWorkosAdminAccessState()).toMatchObject({
      viewer: {
        id: "user_workos_admin",
        email: "admin@example.com",
        name: "WorkOS Admin",
      },
      stale: false,
    });
    expect(checkRecentAuthMock).toHaveBeenCalledWith({ maxAge: 86_400 });
  });

  it("retains the verified viewer when identity mapping fails", async () => {
    await insertUser("admin");
    await client.execute({
      sql: `insert into auth_accounts (id, user_id, provider, provider_user_id, created_at)
            values ('competing-link', 'local-admin', 'workos', 'user_other', ?)`,
      args: [Date.now()],
    });

    expect(await getWorkosAdminAccessState()).toEqual({
      session: null,
      stale: false,
      viewer: {
        id: "user_workos_admin",
        email: "admin@example.com",
        name: "WorkOS Admin",
      },
    });
    expect(checkRecentAuthMock).not.toHaveBeenCalled();
  });

  it.each(syntheticAdminEmails)(
    "grants the same admin session shape to %s",
    async (email) => {
      vi.stubEnv("ADMIN_ALLOWED_EMAILS", syntheticAdminEmails.join(","));
      await insertUser("admin", email);
      withAuthMock.mockResolvedValue({
        user: makeUser({ email }),
        sessionId: "session_1",
        accessToken: "token",
      });

      expect(await getWorkosAdminSession()).toMatchObject({
        user: {
          id: "local-admin",
          role: "admin",
          email,
          name: "WorkOS Admin",
        },
      });
    },
  );

  it("denies a local reader even when the WorkOS email is allowlisted", async () => {
    await insertUser("reader");

    expect(await getWorkosAdminSession()).toBeNull();
  });

  it("exposes only a non-sensitive viewer for a signed-in local reader", async () => {
    await insertUser("reader");

    const state = await getWorkosAdminAccessState();

    expect(state).toEqual({
      session: null,
      stale: false,
      viewer: {
        id: "user_workos_admin",
        email: "admin@example.com",
        name: "WorkOS Admin",
      },
    });
    const serialized = JSON.stringify(state);
    expect(serialized).not.toContain("session_1");
    expect(serialized).not.toContain("accessToken");
    expect(serialized).not.toContain("impersonator");
    expect(checkRecentAuthMock).not.toHaveBeenCalled();
  });

  it("exposes the signed-in viewer without granting access outside the allowlist", async () => {
    vi.stubEnv("ADMIN_ALLOWED_EMAILS", "someone-else@example.com");

    const state = await getWorkosAdminAccessState();

    expect(state).toEqual({
      session: null,
      stale: false,
      viewer: {
        id: "user_workos_admin",
        email: "admin@example.com",
        name: "WorkOS Admin",
      },
    });
    expect(checkRecentAuthMock).not.toHaveBeenCalled();
  });

  it("denies an unverified WorkOS email before mapping or checking recency", async () => {
    await insertUser("admin");
    withAuthMock.mockResolvedValue({
      user: makeUser({ emailVerified: false }),
    });

    expect(await getWorkosAdminSession()).toBeNull();
    expect(checkRecentAuthMock).not.toHaveBeenCalled();
    const accounts = await client.execute(
      "select count(*) as n from auth_accounts",
    );
    expect(Number(accounts.rows[0]?.n)).toBe(0);
  });

  it.each([
    ["stale", { isStale: true }],
    ["missing auth_time", { isStale: true, authTime: undefined }],
  ])("denies a %s session", async (_label, recentAuth) => {
    await insertUser("admin");
    checkRecentAuthMock.mockResolvedValue(recentAuth);

    expect(await getWorkosAdminSession()).toBeNull();
    expect(await getWorkosAdminAccessState()).toEqual({
      session: null,
      stale: true,
      viewer: {
        id: "user_workos_admin",
        email: "admin@example.com",
        name: "WorkOS Admin",
      },
    });
  });

  it("rechecks the current allowlist on every request", async () => {
    await insertUser("admin");
    expect(await getWorkosAdminSession()).not.toBeNull();

    vi.stubEnv("ADMIN_ALLOWED_EMAILS", "someone-else@example.com");

    expect(await getWorkosAdminSession()).toBeNull();
  });

  it("rechecks the live local role on every request", async () => {
    await insertUser("admin");
    expect(await getWorkosAdminSession()).not.toBeNull();

    await client.execute(
      "update users set role = 'reader' where id = 'local-admin'",
    );

    expect(await getWorkosAdminSession()).toBeNull();
  });

  it("does not promote an author during session revalidation", async () => {
    await insertUser("author");

    expect(await getWorkosAdminSession()).toBeNull();
    const user = await client.execute(
      "select role from users where id = 'local-admin'",
    );
    expect(user.rows[0]?.role).toBe("author");
  });

  it("denies anonymous requests", async () => {
    withAuthMock.mockResolvedValue({ user: null });

    expect(await getWorkosAdminSession()).toBeNull();
    expect(await getWorkosAdminAccessState()).toEqual({
      session: null,
      stale: false,
      viewer: null,
    });
    expect(checkRecentAuthMock).not.toHaveBeenCalled();
  });

  it("denies WorkOS impersonation sessions", async () => {
    await insertUser("admin");
    withAuthMock.mockResolvedValue({
      user: makeUser(),
      impersonator: { email: "operator@example.com", reason: "support" },
    });

    expect(await getWorkosAdminSession()).toBeNull();
    expect(await getWorkosAdminAccessState()).toEqual({
      session: null,
      stale: false,
      viewer: null,
    });
  });

  it("logs only safe metadata when the admin identity check fails unexpectedly", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    withAuthMock.mockRejectedValue(
      Object.assign(new Error("token for admin@example.com is invalid"), {
        name: "HttpError",
        code: "ERR_ADMIN_LEAK",
      }),
    );

    expect(await getWorkosAdminSession()).toBeNull();

    expect(captureExceptionMock).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        area: "workos-admin",
        errorName: "HttpError",
        errorCode: "ERR_ADMIN_LEAK",
      }),
    );
    expect(errorSpy).toHaveBeenCalledWith("[auth] admin access check failed", {
      errorName: "HttpError",
      errorCode: "ERR_ADMIN_LEAK",
    });
    const serialized = JSON.stringify(errorSpy.mock.calls);
    expect(serialized).not.toContain("admin@example.com");
    expect(serialized).not.toContain("invalid");
    errorSpy.mockRestore();
  });
});
