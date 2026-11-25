import { readFile } from "node:fs/promises";
import path from "node:path";

import { NextResponse } from "next/server";

import { getLocalMediaRoot } from "@/lib/media/local-storage";

const MIME_TYPES: Record<string, string> = {
  avif: "image/avif",
  gif: "image/gif",
  jpeg: "image/jpeg",
  jpg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

export async function GET(
  _request: Request,
  context: { params: Promise<{ path: string[] }> },
): Promise<NextResponse> {
  const { path: parts } = await context.params;
  const relativePath = parts.join("/");
  const root = getLocalMediaRoot();
  const absolutePath = path.resolve(root, relativePath);

  if (
    !relativePath ||
    relativePath.includes("\0") ||
    !absolutePath.startsWith(`${root}${path.sep}`)
  ) {
    return new NextResponse("Not found", { status: 404 });
  }

  try {
    const bytes = await readFile(absolutePath);
    const extension = path.extname(absolutePath).slice(1).toLowerCase();

    return new NextResponse(bytes, {
      status: 200,
      headers: {
        "Content-Type": MIME_TYPES[extension] ?? "application/octet-stream",
        "Content-Length": String(bytes.byteLength),
        "Cache-Control": "public, max-age=31536000, immutable",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}
