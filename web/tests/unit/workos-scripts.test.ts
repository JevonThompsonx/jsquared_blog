import { mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { createClient } from "@libsql/client";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import {
  WORKOS_CALLBACK_URIS,
  syncWorkosRedirectUris,
} from "../../scripts/configure-workos-redirects.mjs";
import { applyWorkosEnvToFile } from "../../scripts/apply-workos-env.mjs";
import { auditWorkosIdentity } from "../../scripts/audit-workos-identity.mjs";
import { provisionWorkosAdmins } from "../../scripts/provision-workos-admins.mjs";
import {
  captureWorkosStorageState,
  createWorkosStorageState,
  resolveWorkosStorageStatePath,
  writeWorkosStorageStateArtifact,
} from "../../scripts/capture-workos-storage-state";

const workosEnv = {
  WORKOS_CLIENT_ID: "client_test_dummy",
  WORKOS_ISSUER: "https://auth.example.test/user_management/client_test_dummy",
  NEXT_PUBLIC_WORKOS_REDIRECT_URI: "https://jsquaredadventures.com/callback",
  WORKOS_COOKIE_PASSWORD: "test-cookie-password-at-least-32-characters",
  WORKOS_COOKIE_MAX_AGE: "1209600",
};

let tempDir: string;

beforeAll(async () => {
  tempDir = await mkdtemp(path.join(os.tmpdir(), "j2-workos-scripts-"));
});

afterAll(async () => {
  await rm(tempDir, { recursive: true, force: true });
});

describe("configure-workos-redirects", () => {
  it("creates only missing callbacks and is idempotent", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [{ uri: "https://jsquaredadventures.com/callback" }],
        }),
      })
      .mockResolvedValue({ ok: true, json: async () => ({}) });

    const result = await syncWorkosRedirectUris({
      apiKey: "sk_test_dummy",
      fetchImpl: fetchMock,
    });

    expect(result).toEqual({ existing: 1, created: 3 });
    expect(fetchMock).toHaveBeenCalledTimes(4);
    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      "https://api.workos.com/user_management/redirect_uris",
    );
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({
      headers: { Authorization: "Bearer sk_test_dummy" },
    });
    const postedUris = fetchMock.mock.calls
      .slice(1)
      .map((call) => JSON.parse(String(call[1]?.body)).uri);
    expect(postedUris).toEqual(WORKOS_CALLBACK_URIS.slice(1));

    fetchMock.mockClear();
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        data: WORKOS_CALLBACK_URIS.map((uri) => ({ uri })),
      }),
    });
    await expect(
      syncWorkosRedirectUris({ apiKey: "sk_test_dummy", fetchImpl: fetchMock }),
    ).resolves.toEqual({ existing: 4, created: 0 });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("fails without echoing the API key", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ message: "unauthorized" }),
    });

    await expect(
      syncWorkosRedirectUris({ apiKey: "sk_test_dummy", fetchImpl: fetchMock }),
    ).rejects.toThrow(/WorkOS redirect URI list failed \(401\)/);
  });
});

describe("apply-workos-env", () => {
  it("updates WorkOS keys atomically, removes the API key, and preserves legacy vars", async () => {
    const filePath = path.join(tempDir, "blog.env");
    await writeFile(
      filePath,
      [
        "# existing environment",
        "BETTER_AUTH_SECRET=legacy-dummy-secret",
        "AUTH_GITHUB_ID=legacy-dummy-id",
        "WORKOS_API_KEY=sk_test_remove_me",
        "WORKOS_CLIENT_ID=old-client",
        "",
      ].join("\n"),
      { mode: 0o600 },
    );

    await applyWorkosEnvToFile({ filePath, env: workosEnv });

    const content = await readFile(filePath, "utf8");
    expect(content).toContain("BETTER_AUTH_SECRET=legacy-dummy-secret");
    expect(content).toContain("AUTH_GITHUB_ID=legacy-dummy-id");
    expect(content).toContain(`WORKOS_CLIENT_ID=${workosEnv.WORKOS_CLIENT_ID}`);
    expect(content).toContain(
      `NEXT_PUBLIC_WORKOS_REDIRECT_URI=${workosEnv.NEXT_PUBLIC_WORKOS_REDIRECT_URI}`,
    );
    expect(content).not.toContain("WORKOS_API_KEY");
    expect(content).not.toContain("old-client");
    expect((await stat(filePath)).mode & 0o777).toBe(0o600);
  });

  it("rejects an untrusted callback before touching the file", async () => {
    const filePath = path.join(tempDir, "invalid.env");
    await writeFile(filePath, "UNCHANGED=1\n");

    await expect(
      applyWorkosEnvToFile({
        filePath,
        env: {
          ...workosEnv,
          NEXT_PUBLIC_WORKOS_REDIRECT_URI: "https://evil.example/callback",
        },
      }),
    ).rejects.toThrow(/callback/i);
    expect(await readFile(filePath, "utf8")).toBe("UNCHANGED=1\n");
  });
});

describe("audit-workos-identity", () => {
  it("reports duplicate emails, legacy links, and allowlisted non-admins without PII", async () => {
    const client = createClient({
      url: `file:${path.join(tempDir, "audit.db")}`,
    });
    try {
      await client.executeMultiple(`
        create table users (id text primary key, primary_email text not null, role text not null);
        create table profiles (user_id text primary key);
        create table auth_accounts (id text primary key, user_id text not null, provider text not null, provider_user_id text not null);
        insert into users values ('one', 'Admin@Example.com', 'reader');
        insert into users values ('two', 'admin@example.com', 'admin');
        insert into users values ('three', 'legacy@legacy.supabase.local', 'reader');
        insert into profiles values ('one');
        insert into profiles values ('two');
        insert into auth_accounts values ('a1', 'one', 'workos', 'user_one');
        insert into auth_accounts values ('a2', 'three', 'workos', 'user_three');
        insert into auth_accounts values ('a3', 'two', 'workos', 'user_one');
      `);

      const report = await auditWorkosIdentity(client, {
        allowedEmails: ["admin@example.com"],
      });

      expect(report).toEqual({
        users: 3,
        profiles: 2,
        workosAccounts: 3,
        duplicateNormalizedEmails: 1,
        duplicateProviderSubjects: 1,
        legacyWorkosLinks: 1,
        orphanWorkosLinks: 0,
        allowlistedNonAdmins: 1,
      });
      expect(JSON.stringify(report)).not.toContain("@example.com");
    } finally {
      client.close();
    }
  });
});

describe("provision-workos-admins", () => {
  it("is dry-run by default and idempotently preserves existing linked IDs", async () => {
    const client = createClient({
      url: `file:${path.join(tempDir, "provision.db")}`,
    });
    try {
      await client.executeMultiple(`
        create table users (id text primary key, primary_email text not null, name text not null default '', email_verified integer not null default 0, role text not null, created_at integer not null, updated_at integer not null);
        create table profiles (user_id text primary key, display_name text not null, created_at integer not null, updated_at integer not null);
        create table auth_accounts (id text primary key, user_id text not null, provider text not null, provider_user_id text not null, created_at integer not null);
        insert into users values ('local-admin', 'Admin@Example.com', '', 1, 'reader', 1, 1);
        insert into profiles values ('local-admin', 'Keep this name', 1, 1);
        insert into auth_accounts values ('link-one', 'local-admin', 'workos', 'user_linked', 1);
      `);
      const allowedEmails = ["admin@example.com", " NEW@Example.com "];

      const dryRun = await provisionWorkosAdmins(client, { allowedEmails });
      expect(dryRun).toEqual({
        examined: 2,
        created: 1,
        promoted: 1,
        profilesCreated: 1,
        unchanged: 0,
      });
      const before = await client.execute(
        "select id, role from users order by id",
      );
      expect(before.rows).toEqual([{ id: "local-admin", role: "reader" }]);

      const applied = await provisionWorkosAdmins(client, {
        allowedEmails,
        apply: true,
      });
      expect(applied).toEqual(dryRun);
      const users = await client.execute(
        "select id, primary_email, role from users order by id",
      );
      expect(users.rows).toEqual([
        {
          id: "local-admin",
          primary_email: "Admin@Example.com",
          role: "admin",
        },
        expect.objectContaining({
          primary_email: "new@example.com",
          role: "admin",
        }),
      ]);
      const profile = await client.execute(
        "select display_name from profiles where user_id = 'local-admin'",
      );
      expect(profile.rows[0]?.display_name).toBe("Keep this name");
      const link = await client.execute(
        "select user_id from auth_accounts where id = 'link-one'",
      );
      expect(link.rows[0]?.user_id).toBe("local-admin");

      await expect(
        provisionWorkosAdmins(client, { allowedEmails, apply: true }),
      ).resolves.toEqual({
        examined: 2,
        created: 0,
        promoted: 0,
        profilesCreated: 0,
        unchanged: 2,
      });
    } finally {
      client.close();
    }
  });
});

describe("capture-workos-storage-state", () => {
  it("writes the admin fixture path and origin metadata expected by E2E helpers", async () => {
    const storageStatePath = resolveWorkosStorageStatePath({
      cwd: tempDir,
      env: { NODE_ENV: "test" },
    });
    expect(storageStatePath).toBe(
      path.join(tempDir, "playwright", ".auth", "admin.json"),
    );

    await writeWorkosStorageStateArtifact({
      storageStatePath,
      baseURL: "http://localhost:3000",
      state: createWorkosStorageState({
        sealedSession: "fixture",
        baseURL: "http://localhost:3000",
        maxAge: 100,
        now: new Date("2026-11-24T00:00:00.000Z"),
      }),
      now: new Date("2026-11-24T00:00:00.000Z"),
    });

    const metadataPath = storageStatePath.replace(/\.json$/, ".meta.json");
    expect(JSON.parse(await readFile(metadataPath, "utf8"))).toEqual({
      artifactType: "admin-playwright-storage-state",
      artifactVersion: 1,
      createdAt: "2026-11-24T00:00:00.000Z",
      origin: "http://localhost:3000",
    });
    expect((await stat(storageStatePath)).mode & 0o777).toBe(0o600);
  });

  it("uses the SDK sealedSession and never stores raw tokens", async () => {
    const authenticate = vi.fn().mockResolvedValue({
      sealedSession: "sealed-session-fixture",
      accessToken: "must-not-be-stored",
      refreshToken: "must-not-be-stored",
      user: { id: "user_fixture", email: "fixture@example.com" },
    });

    const state = await captureWorkosStorageState({
      email: "fixture@example.com",
      password: "dummy-password",
      clientId: "client_test_dummy",
      cookiePassword: workosEnv.WORKOS_COOKIE_PASSWORD,
      baseURL: "https://jsquaredadventures.com",
      maxAge: 1_209_600,
      authenticate,
    });

    expect(authenticate).toHaveBeenCalledWith({
      email: "fixture@example.com",
      password: "dummy-password",
      clientId: "client_test_dummy",
      session: {
        sealSession: true,
        cookiePassword: workosEnv.WORKOS_COOKIE_PASSWORD,
      },
    });
    expect(state.cookies).toEqual([
      expect.objectContaining({
        name: "wos-session",
        value: "sealed-session-fixture",
        httpOnly: true,
        secure: true,
        sameSite: "Lax",
      }),
    ]);
    expect(JSON.stringify(state)).not.toContain("must-not-be-stored");
  });

  it("creates host-scoped cookie metadata for local HTTP fixtures", () => {
    const state = createWorkosStorageState({
      sealedSession: "sealed-local-fixture",
      baseURL: "http://localhost:3000",
      maxAge: 1_209_600,
      now: new Date("2026-11-24T00:00:00.000Z"),
    });

    expect(state.cookies[0]).toMatchObject({
      name: "wos-session",
      value: "sealed-local-fixture",
      domain: "localhost",
      path: "/",
      httpOnly: true,
      secure: false,
      sameSite: "Lax",
      expires:
        Math.floor(new Date("2026-11-24T00:00:00.000Z").getTime() / 1000) +
        1_209_600,
    });
    expect(state.origins).toEqual([]);
  });

  it("rejects invalid fixture origins and lifetimes", () => {
    expect(() =>
      createWorkosStorageState({
        sealedSession: "fixture",
        baseURL: "ftp://example.com",
        maxAge: 100,
      }),
    ).toThrow(/HTTP/);
    expect(() =>
      createWorkosStorageState({
        sealedSession: "fixture",
        baseURL: "http://localhost:3000",
        maxAge: 0,
      }),
    ).toThrow(/maxAge/);
  });
});
