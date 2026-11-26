import "server-only";

import { createHash } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

import sharp from "sharp";

import { getEnvSource } from "@/lib/env";
import { slugify } from "@/lib/utils";

export type LocalMediaUpload = {
  provider: "local";
  publicId: string;
  imageUrl: string;
  format: "webp";
  width: number;
  height: number;
  bytes: number;
  exif: {
    takenAt: Date | null;
    lat: number | null;
    lng: number | null;
    cameraMake: string | null;
    cameraModel: string | null;
    lensModel: string | null;
    aperture: number | null;
    shutterSpeed: string | null;
    iso: number | null;
  };
};

export function getLocalMediaRoot(): string {
  const env = getEnvSource();
  const configured = env.LOCAL_MEDIA_ROOT?.trim();

  if (configured && configured.length > 0) {
    return path.resolve(configured);
  }

  // The local origin is identified by its explicit in-process rate limiter.
  // Falling back to `public/media` there would write uploads into the release
  // directory, which the next deploy replaces.
  if (env.RATE_LIMIT_DRIVER === "memory") {
    throw new Error("LOCAL_MEDIA_ROOT is required for the local origin");
  }

  return path.resolve(process.cwd(), "public", "media");
}

function safeBaseName(fileName: string): string {
  const withoutExtension = fileName.replace(/\.[^.]+$/, "");
  return slugify(withoutExtension).slice(0, 80) || "image";
}

/**
 * Store an uploaded image under LOCAL_MEDIA_ROOT as content-addressed WebP.
 *
 * Sharp re-encodes the image, which drops EXIF/IPTC/XMP by default. Only
 * display-safe metadata is kept; GPS is never returned or written to the DB.
 */
export async function saveLocalImage(
  file: File,
  options: { kind: "editorial" | "avatar" } = { kind: "editorial" },
): Promise<LocalMediaUpload> {
  const source = Buffer.from(await file.arrayBuffer());
  const pipeline = sharp(source, { failOn: "error" }).rotate();
  const { data: webp, info } = await pipeline
    .webp({ quality: 82, effort: 4 })
    .toBuffer({ resolveWithObject: true });

  if (!info.width || !info.height) {
    throw new Error("Uploaded image has no readable dimensions");
  }
  const hash = createHash("sha256").update(webp).digest("hex").slice(0, 16);
  const now = new Date();
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  const relativePath = [
    options.kind === "avatar" ? "avatars" : "editorial",
    String(now.getUTCFullYear()),
    month,
    `${hash}-${safeBaseName(file.name)}.webp`,
  ].join("/");
  const absolutePath = path.join(getLocalMediaRoot(), relativePath);

  await mkdir(path.dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, webp);

  return {
    provider: "local",
    publicId: relativePath,
    imageUrl: `/media/${relativePath}`,
    format: "webp",
    width: info.width,
    height: info.height,
    bytes: webp.byteLength,
    exif: {
      takenAt: null,
      lat: null,
      lng: null,
      cameraMake: null,
      cameraModel: null,
      lensModel: null,
      aperture: null,
      shutterSpeed: null,
      iso: null,
    },
  };
}

export async function deleteLocalMedia(publicId: string): Promise<void> {
  const root = getLocalMediaRoot();
  const absolutePath = path.resolve(root, publicId);
  if (!absolutePath.startsWith(`${root}${path.sep}`)) {
    throw new Error("Refusing to delete a file outside LOCAL_MEDIA_ROOT");
  }

  try {
    await unlink(absolutePath);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      throw error;
    }
  }
}
