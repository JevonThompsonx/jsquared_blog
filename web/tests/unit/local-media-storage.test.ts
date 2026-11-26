import { mkdtemp, readdir, rm, stat } from "node:fs/promises";
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

async function importStorageModule() {
  vi.resetModules();
  vi.doMock("@/lib/env-loader", () => ({
    loadEnvironmentFiles: () => {},
  }));
  return import("@/lib/media/local-storage");
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

function pngBuffer(): Buffer {
  // 1x1 transparent PNG.
  return Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
    "base64",
  );
}

describe("local media storage", () => {
  beforeEach(async () => {
    mediaRoot = await mkdtemp(path.join(os.tmpdir(), "j2-media-"));
    applyBaseEnv(mediaRoot);
  });

  afterEach(async () => {
    vi.unstubAllEnvs();
    vi.resetModules();
    await rm(mediaRoot, { recursive: true, force: true });
  });

  it("stores uploads as content-addressed WebP under the media root", async () => {
    const { saveLocalImage } = await importStorageModule();
    const file = new File([new Uint8Array(pngBuffer())], "Trail Photo.PNG", {
      type: "image/png",
    });

    const result = await saveLocalImage(file, { kind: "editorial" });

    expect(result.provider).toBe("local");
    expect(result.imageUrl).toMatch(
      /^\/media\/editorial\/\d{4}\/\d{2}\/[a-f0-9]{16}-trail-photo\.webp$/,
    );
    expect(result.format).toBe("webp");
    expect(result.exif.lat).toBeNull();
    expect(result.exif.lng).toBeNull();

    const stored = await stat(path.join(mediaRoot, result.publicId));
    expect(stored.isFile()).toBe(true);
    expect(stored.size).toBe(result.bytes);
  });

  it("stores avatars under an avatars prefix", async () => {
    const { saveLocalImage } = await importStorageModule();
    const file = new File([new Uint8Array(pngBuffer())], "me.png", {
      type: "image/png",
    });

    const result = await saveLocalImage(file, { kind: "avatar" });
    expect(result.publicId.startsWith("avatars/")).toBe(true);
  });

  it("refuses to delete a path outside the media root", async () => {
    const { deleteLocalMedia } = await importStorageModule();

    await expect(deleteLocalMedia("../outside.webp")).rejects.toThrow(
      /outside LOCAL_MEDIA_ROOT/i,
    );
  });

  it("is idempotent when deleting a file that does not exist", async () => {
    const { deleteLocalMedia } = await importStorageModule();

    await expect(
      deleteLocalMedia("editorial/2026/11/missing.webp"),
    ).resolves.toBeUndefined();
    expect(await readdir(mediaRoot)).toEqual([]);
  });

  it("deletes an existing stored file", async () => {
    const { deleteLocalMedia, saveLocalImage } = await importStorageModule();
    const file = new File([new Uint8Array(pngBuffer())], "delete-me.png", {
      type: "image/png",
    });
    const upload = await saveLocalImage(file, { kind: "editorial" });
    const target = path.join(mediaRoot, upload.publicId);

    await expect(deleteLocalMedia(upload.publicId)).resolves.toBeUndefined();
    await expect(stat(target)).rejects.toMatchObject({ code: "ENOENT" });
  });
});

describe("saveLocalImage — orientation", () => {
  beforeEach(async () => {
    mediaRoot = await mkdtemp(path.join(os.tmpdir(), "j2-media-"));
    applyBaseEnv(mediaRoot);
  });

  afterEach(async () => {
    vi.unstubAllEnvs();
    vi.resetModules();
    await rm(mediaRoot, { recursive: true, force: true });
  });

  it("records the post-rotation dimensions for EXIF-oriented images", async () => {
    const { saveLocalImage } = await importStorageModule();
    const oriented = await sharp({
      create: { width: 2000, height: 1000, channels: 3, background: "#123456" },
    })
      .jpeg()
      .withMetadata({ orientation: 6 })
      .toBuffer();

    const result = await saveLocalImage(
      new File([new Uint8Array(oriented)], "rotated.jpg", {
        type: "image/jpeg",
      }),
      { kind: "editorial" },
    );

    expect(result.width).toBe(1000);
    expect(result.height).toBe(2000);
  });
});
