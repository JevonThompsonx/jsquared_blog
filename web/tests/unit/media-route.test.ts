import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const REQUIRED_SERVER_ENV: Record<string, string> = {
  TURSO_DATABASE_URL: "https://example-db.turso.io",
  TURSO_AUTH_TOKEN: "turso-token",
  AUTH_SECRET: "abcdefghijklmnopqrstuvwxyz123456",
  AUTH_GITHUB_ID: "github-client-id",
  AUTH_GITHUB_SECRET: "github-client-secret",
  SUPABASE_URL: "https://example.supabase.co",
  SUPABASE_ANON_KEY: "supabase-anon-key",
};

let mediaRoot: string;

async function importMediaRoute() {
  vi.resetModules();
  vi.doMock("@/lib/env-loader", () => ({
    loadEnvironmentFiles: () => {},
  }));
  return import("@/app/media/[...path]/route");
}

function applyBaseEnv(root: string): void {
  for (const [key, value] of Object.entries(REQUIRED_SERVER_ENV)) {
    vi.stubEnv(key, value);
  }

  vi.stubEnv("NEXT_PHASE", "test");
  vi.stubEnv("NODE_ENV", "test");
  vi.stubEnv("VERCEL", "");
  vi.stubEnv("LOCAL_MEDIA_ROOT", root);
  vi.stubEnv("CRON_SECRET", "1234567890abcdef");
}

function context(...parts: string[]) {
  return { params: Promise.resolve({ path: parts }) };
}

describe("GET /media/[...path]", () => {
  beforeEach(async () => {
    mediaRoot = await mkdtemp(path.join(os.tmpdir(), "j2-media-route-"));
    applyBaseEnv(mediaRoot);
  });

  afterEach(async () => {
    vi.unstubAllEnvs();
    vi.resetModules();
    await rm(mediaRoot, { recursive: true, force: true });
  });

  it("serves a stored WebP with immutable caching", async () => {
    const target = path.join(mediaRoot, "2026", "11", "photo.webp");
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, Buffer.from([0x52, 0x49, 0x46, 0x46]));

    const { GET } = await importMediaRoute();
    const response = await GET(
      new Request("http://localhost/media/2026/11/photo.webp"),
      context("2026", "11", "photo.webp"),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("image/webp");
    expect(response.headers.get("cache-control")).toContain("immutable");
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
  });

  it("returns 404 for a missing file", async () => {
    const { GET } = await importMediaRoute();
    const response = await GET(
      new Request("http://localhost/media/nope.webp"),
      context("nope.webp"),
    );

    expect(response.status).toBe(404);
  });

  it("rejects traversal outside the media root", async () => {
    const { GET } = await importMediaRoute();

    const up = await GET(
      new Request("http://localhost/media/x"),
      context("..", "..", "etc", "passwd"),
    );
    expect(up.status).toBe(404);

    const nul = await GET(
      new Request("http://localhost/media/x"),
      context("a\0b.webp"),
    );
    expect(nul.status).toBe(404);
  });

  it("rejects an empty path", async () => {
    const { GET } = await importMediaRoute();
    const response = await GET(
      new Request("http://localhost/media"),
      context(),
    );

    expect(response.status).toBe(404);
  });
});
