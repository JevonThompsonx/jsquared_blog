import { NextResponse } from "next/server";

import { requireAdminSession } from "@/lib/auth/session";
import { checkRateLimit, getClientIp, tooManyRequests } from "@/lib/rate-limit";
import { getSongPreviewMetadata } from "@/lib/post-song-metadata";

const RATE_LIMIT = 30;
const RATE_WINDOW_MS = 60_000;
const SPOTIFY_OEMBED_ENDPOINT = "https://open.spotify.com/oembed";

function isSafeSpotifyArtworkUrl(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  try {
    const parsed = new URL(value);
    if (parsed.protocol !== "https:") {
      return null;
    }

    return parsed.hostname.endsWith(".scdn.co") ? parsed.toString() : null;
  } catch {
    return null;
  }
}

export async function POST(request: Request): Promise<NextResponse> {
  const session = await requireAdminSession();
  if (session?.user?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const rl = await checkRateLimit(`admin-song-preview:${session.user.id}:${getClientIp(request)}`, RATE_LIMIT, RATE_WINDOW_MS);
  if (!rl.allowed) {
    return tooManyRequests(rl);
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid song preview request" }, { status: 422 });
  }

  const url = typeof body === "object" && body !== null && "url" in body && typeof body.url === "string" ? body.url.trim() : "";
  if (!url) {
    return NextResponse.json({ error: "Invalid song preview request" }, { status: 422 });
  }

  const preview = getSongPreviewMetadata({ songUrl: url, songTitle: "", songArtist: "" });
  if (!preview) {
    return NextResponse.json({ error: "Invalid song preview request" }, { status: 422 });
  }

  if (!preview.spotify) {
    return NextResponse.json({
      song: preview,
      source: "manual",
    });
  }

  try {
    const upstreamUrl = `${SPOTIFY_OEMBED_ENDPOINT}?url=${encodeURIComponent(preview.spotify.canonicalUrl)}`;
    const response = await fetch(upstreamUrl, {
      headers: {
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      return NextResponse.json({ error: "Song preview unavailable" }, { status: 503 });
    }

    const payload = await response.json() as {
      title?: unknown;
      thumbnail_url?: unknown;
      html?: unknown;
    };

    return NextResponse.json({
      song: {
        ...preview,
        title: typeof payload.title === "string" && payload.title.trim() ? payload.title.trim() : preview.title,
      },
      artworkUrl: isSafeSpotifyArtworkUrl(payload.thumbnail_url),
      source: "spotify-oembed",
    });
  } catch {
    return NextResponse.json({ error: "Song preview unavailable" }, { status: 503 });
  }
}
