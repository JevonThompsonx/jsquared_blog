import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { NextResponse } from "next/server";
import sharp from "sharp";

import { getLocalMediaRoot } from "@/lib/media/local-storage";

const OG_WIDTH = 1200;
const OG_HEIGHT = 630;
const CACHE_CONTROL = "public, max-age=31536000, immutable";

function jpegResponse(bytes: Buffer): NextResponse {
  return new NextResponse(new Uint8Array(bytes), {
    status: 200,
    headers: {
      "Content-Type": "image/jpeg",
      "Content-Length": String(bytes.byteLength),
      "Cache-Control": CACHE_CONTROL,
      "X-Content-Type-Options": "nosniff",
    },
  });
}

/**
 * Fixed 1200×630 JPEG derivative for social cards.
 *
 * Sources are validated against `LOCAL_MEDIA_ROOT`; the rendered JPEG is
 * cached on disk so crawler traffic does not re-encode on every request.
 */
export async function GET(
  _request: Request,
  context: { params: Promise<{ path: string[] }> },
): Promise<NextResponse> {
  const { path: parts } = await context.params;
  const relativePath = parts.join("/");
  const mediaRoot = getLocalMediaRoot();
  const sourcePath = path.resolve(mediaRoot, relativePath);

  if (
    !relativePath ||
    relativePath.includes("\0") ||
    relativePath.split("/").includes("..") ||
    !sourcePath.startsWith(`${mediaRoot}${path.sep}`)
  ) {
    return new NextResponse("Not found", { status: 404 });
  }

  const cacheRoot = path.resolve(mediaRoot, "..", "cache", "og");
  const cacheKey = createHash("sha256")
    .update(relativePath)
    .digest("hex")
    .slice(0, 32);
  const cachedPath = path.join(cacheRoot, `${cacheKey}.jpg`);

  try {
    return jpegResponse(await readFile(cachedPath));
  } catch {
    // not cached yet
  }

  try {
    const source = await readFile(sourcePath);
    const output = await sharp(source, { failOn: "error" })
      .resize(OG_WIDTH, OG_HEIGHT, { fit: "cover", position: "attention" })
      .jpeg({ quality: 82, mozjpeg: true })
      .toBuffer();

    await mkdir(cacheRoot, { recursive: true });
    await writeFile(cachedPath, output);

    return jpegResponse(output);
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}
