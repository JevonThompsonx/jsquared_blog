import { z } from "zod";

import { getSpotifyEmbedHeight, parseSpotifyEmbedUrl } from "@/lib/spotify";
import type { BlogSongMetadata } from "@/types/blog";

const songUrlSchema = z.url({ protocol: /^https$/ }).transform((value) => value.trim());

type SongMetadataInput = {
  songTitle?: string | null;
  songArtist?: string | null;
  songUrl?: string | null;
};

export type SongMetadataFields = {
  songTitle: string | null;
  songArtist: string | null;
  songUrl: string | null;
};

function normalizeOptionalSongText(value: string): string | null {
  return value ? value : null;
}

function trimSongValue(value: string | null | undefined): string {
  return typeof value === "string" ? value.trim() : "";
}

export function normalizeSongMetadataFields(input: SongMetadataInput): SongMetadataFields {
  const songTitle = trimSongValue(input.songTitle);
  const songArtist = trimSongValue(input.songArtist);
  const songUrl = trimSongValue(input.songUrl);

  if (!songTitle && !songArtist && !songUrl) {
    return {
      songTitle: null,
      songArtist: null,
      songUrl: null,
    };
  }

  if (!songUrl) {
    throw new Error("Invalid request");
  }

  const parsedUrl = songUrlSchema.safeParse(songUrl);
  if (!parsedUrl.success) {
    throw new Error("Invalid request");
  }

  if ((songTitle && !songArtist) || (!songTitle && songArtist)) {
    throw new Error("Invalid request");
  }

  return {
    songTitle: normalizeOptionalSongText(songTitle),
    songArtist: normalizeOptionalSongText(songArtist),
    songUrl: parsedUrl.data,
  };
}

export function getSongMetadata(input: SongMetadataInput): BlogSongMetadata | null {
  try {
    const normalized = normalizeSongMetadataFields(input);
    if (!normalized.songTitle || !normalized.songArtist || !normalized.songUrl) {
      if (!normalized.songUrl) {
        return null;
      }
    }

    return {
      title: normalized.songTitle,
      artist: normalized.songArtist,
      url: normalized.songUrl,
    };
  } catch {
    return null;
  }
}

export type SongPreviewMetadata = {
  title: string | null;
  artist: string | null;
  url: string;
  spotify: {
    kind: "track" | "playlist" | "album";
    canonicalUrl: string;
    embedUrl: string;
    height: number;
  } | null;
};

export function getSongPreviewMetadata(input: SongMetadataInput): SongPreviewMetadata | null {
  const song = getSongMetadata(input);
  if (!song) {
    return null;
  }

  const spotify = parseSpotifyEmbedUrl(song.url);

  return {
    ...song,
    spotify: spotify
        ? {
            kind: spotify.kind,
            canonicalUrl: spotify.canonicalUrl,
            embedUrl: spotify.embedUrl,
            height: getSpotifyEmbedHeight(spotify.kind),
          }
        : null,
  };
}
