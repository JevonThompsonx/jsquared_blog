import { mkdir, mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import sharp from "sharp";
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

async function importRoute() {
  vi.resetModules();
  vi.doMock("@/lib/env-loader", () => ({ loadEnvironmentFiles: () => {} }));
  return import("@/app/api/og-image/[...path]/route");
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

describe("GET /api/og-image/[...path]", () => {
  beforeEach(async () => {
    mediaRoot = await mkdtemp(path.join(os.tmpdir(), "j2-og-"));
    applyBaseEnv(mediaRoot);
    const dir = path.join(mediaRoot, "2026", "11");
    await mkdir(dir, { recursive: true });
    await sharp({
      create: { width: 1600, height: 900, channels: 3, background: "#336699" },
    })
      .webp()
      .toFile(path.join(dir, "hero.webp"));
  });

  afterEach(async () => {
    vi.unstubAllEnvs();
    vi.resetModules();
    await rm(mediaRoot, { recursive: true, force: true });
  });

  it("renders a 1200x630 JPEG and caches it on disk", async () => {
    const { GET } = await importRoute();
    const response = await GET(
      new Request("http://localhost/api/og-image/2026/11/hero.webp"),
      context("2026", "11", "hero.webp"),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("image/jpeg");
    expect(response.headers.get("cache-control")).toContain("immutable");

    const bytes = Buffer.from(await response.arrayBuffer());
    const metadata = await sharp(bytes).metadata();
    expect(metadata.width).toBe(1200);
    expect(metadata.height).toBe(630);

    const cacheRoot = path.resolve(mediaRoot, "..", "cache", "og");
    // The route caches beside the media root; find the single file.
    const { readdir } = await import("node:fs/promises");
    const cached = await readdir(cacheRoot);
    expect(cached).toHaveLength(1);
    const cachedBytes = await readFile(path.join(cacheRoot, cached[0]));
    expect(cachedBytes.byteLength).toBe(bytes.byteLength);
  });

  it("returns 404 for missing media", async () => {
    const { GET } = await importRoute();
    const response = await GET(
      new Request("http://localhost/api/og-image/nope.webp"),
      context("nope.webp"),
    );
    expect(response.status).toBe(404);
  });

  it("rejects traversal outside the media root", async () => {
    const { GET } = await importRoute();
    const response = await GET(
      new Request("http://localhost/api/og-image/x"),
      context("..", "..", "etc", "passwd"),
    );
    expect(response.status).toBe(404);
  });
});
