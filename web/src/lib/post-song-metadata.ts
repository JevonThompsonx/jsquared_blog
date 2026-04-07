import { z } from "zod";

import type { BlogSongMetadata } from "@/types/blog";

const songMetadataSchema = z.object({
  title: z.string().trim().min(1).max(160),
  artist: z.string().trim().min(1).max(160),
  url: z.url({ protocol: /^https$/ }).transform((value) => value.trim()),
});

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

  const parsed = songMetadataSchema.safeParse({
    title: songTitle,
    artist: songArtist,
    url: songUrl,
  });

  if (!parsed.success) {
    throw new Error("Invalid request");
  }

  return {
    songTitle: parsed.data.title,
    songArtist: parsed.data.artist,
    songUrl: parsed.data.url,
  };
}

export function getSongMetadata(input: SongMetadataInput): BlogSongMetadata | null {
  try {
    const normalized = normalizeSongMetadataFields(input);
    if (!normalized.songTitle || !normalized.songArtist || !normalized.songUrl) {
      return null;
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
