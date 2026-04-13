import { describe, expect, it } from "vitest";

import { getSongPreviewMetadata } from "@/lib/post-song-metadata";

describe("getSongPreviewMetadata", () => {
  it("returns manual preview data for non-Spotify HTTPS URLs", () => {
    expect(
      getSongPreviewMetadata({
        songTitle: "",
        songArtist: "",
        songUrl: "https://music.example.com/track/123",
      }),
    ).toEqual({
      title: null,
      artist: null,
      url: "https://music.example.com/track/123",
      spotify: null,
    });
  });

  it("returns Spotify preview metadata with canonical embed height", () => {
    expect(
      getSongPreviewMetadata({
        songTitle: "Holocene",
        songArtist: "Bon Iver",
        songUrl: "https://open.spotify.com/album/1ATL5GLyefJaxhQzSPVrLX",
      }),
    ).toEqual({
      title: "Holocene",
      artist: "Bon Iver",
      url: "https://open.spotify.com/album/1ATL5GLyefJaxhQzSPVrLX",
      spotify: {
        kind: "album",
        canonicalUrl: "https://open.spotify.com/album/1ATL5GLyefJaxhQzSPVrLX",
        embedUrl: "https://open.spotify.com/embed/album/1ATL5GLyefJaxhQzSPVrLX?utm_source=generator&theme=0",
        height: 352,
      },
    });
  });
});
