import { afterEach, describe, expect, it, vi } from "vitest";

const REQUIRED_SERVER_ENV: Record<string, string> = {
  TURSO_DATABASE_URL: "https://example-db.turso.io",
  TURSO_AUTH_TOKEN: "turso-token",
  AUTH_SECRET: "abcdefghijklmnopqrstuvwxyz123456",
  AUTH_GITHUB_ID: "github-client-id",
  AUTH_GITHUB_SECRET: "github-client-secret",
  SUPABASE_URL: "https://example.supabase.co",
  SUPABASE_ANON_KEY: "supabase-anon-key",
};

function applyBaseEnv(): void {
  for (const [key, value] of Object.entries(REQUIRED_SERVER_ENV)) {
    vi.stubEnv(key, value);
  }

  vi.stubEnv("NEXT_PHASE", "test");
  vi.stubEnv("NODE_ENV", "test");
  vi.stubEnv("VERCEL", "");
  vi.stubEnv("CRON_SECRET", "1234567890abcdef");
}

type HealthOptions = {
  databaseOk: boolean;
  mediaOk: boolean;
  writeOk?: boolean;
  schemaOk?: boolean;
};

function createClientMock(options: HealthOptions) {
  return {
    execute: async (sql: unknown) => {
      const text =
        typeof sql === "string"
          ? sql
          : String((sql as { sql?: string }).sql ?? "");
      if (/from\s+posts/i.test(text)) {
        if (!options.databaseOk) throw new Error("db down");
        return { rows: [{ n: 4 }] };
      }
      if (/sqlite_master/i.test(text)) {
        // One query counts the critical indexes.
        return { rows: [{ n: options.schemaOk === false ? 2 : 5 }] };
      }
      return { rows: [] };
    },
    transaction: async () => ({
      execute: async () => {
        if (options.writeOk === false) {
          throw new Error("attempt to write a readonly database");
        }
        return { rows: [] };
      },
      commit: async () => {},
      rollback: async () => {},
    }),
  };
}

async function importHealthRoute(options: HealthOptions) {
  vi.resetModules();
  vi.doMock("@/lib/env-loader", () => ({ loadEnvironmentFiles: () => {} }));
  vi.doMock("@/lib/db-core", () => ({
    getDbClient: () => createClientMock(options),
  }));
  vi.doMock("@/lib/db", () => ({
    getDbClient: () => createClientMock(options),
  }));
  vi.doMock("@/lib/media/local-storage", () => ({
    getLocalMediaRoot: () => "/tmp/health-media",
  }));
  vi.doMock("node:fs/promises", async (importOriginal) => {
    const actual = await importOriginal<typeof import("node:fs/promises")>();
    return {
      ...actual,
      mkdir: async () => {
        if (!options.mediaOk) throw new Error("read-only");
      },
      access: async () => {
        if (!options.mediaOk) throw new Error("denied");
      },
    };
  });
  return import("@/app/api/health/route");
}

async function getHealth(options: HealthOptions) {
  const { GET } = await importHealthRoute(options);
  const response = await GET();
  const body = (await response.json()) as {
    status: string;
    checks: Record<string, unknown>;
  };
  return { response, body };
}

describe("GET /api/health", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
    vi.doUnmock("node:fs/promises");
  });

  it("returns 200 when read, write, schema, and media probes pass", async () => {
    applyBaseEnv();
    const { response, body } = await getHealth({
      databaseOk: true,
      mediaOk: true,
    });

    expect(response.status).toBe(200);
    expect(body.status).toBe("ok");
    expect(body.checks).toEqual({
      database: true,
      databaseWrite: true,
      schema: true,
      media: true,
    });
    expect(response.headers.get("cache-control")).toBe("no-store");
  });

  it("returns 503 without leaking error details when the database is down", async () => {
    applyBaseEnv();
    const { response, body } = await getHealth({
      databaseOk: false,
      mediaOk: true,
    });

    expect(response.status).toBe(503);
    expect(body.status).toBe("degraded");
    expect(body.checks.database).toBe(false);
    expect(JSON.stringify(body)).not.toContain("db down");
  });

  it("returns 503 when the write probe cannot open a write transaction", async () => {
    applyBaseEnv();
    const { response, body } = await getHealth({
      databaseOk: true,
      mediaOk: true,
      writeOk: false,
    });

    expect(response.status).toBe(503);
    expect(body.checks.databaseWrite).toBe(false);
    expect(JSON.stringify(body)).not.toContain("readonly");
  });

  it("returns 503 when a critical index is missing", async () => {
    applyBaseEnv();
    const { response, body } = await getHealth({
      databaseOk: true,
      mediaOk: true,
      schemaOk: false,
    });

    expect(response.status).toBe(503);
    expect(body.checks.schema).toBe(false);
  });

  it("returns 503 when media storage is not writable", async () => {
    applyBaseEnv();
    const { response, body } = await getHealth({
      databaseOk: true,
      mediaOk: false,
    });

    expect(response.status).toBe(503);
    expect(body.checks.media).toBe(false);
  });
});
