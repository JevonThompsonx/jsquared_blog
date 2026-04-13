import { describe, expect, it } from "vitest";

import { getSongMetadata, normalizeSongMetadataFields } from "@/lib/post-song-metadata";

describe("normalizeSongMetadataFields", () => {
  it("returns null fields when all inputs are blank", () => {
    expect(normalizeSongMetadataFields({ songTitle: " ", songArtist: "", songUrl: "  " })).toEqual({
      songTitle: null,
      songArtist: null,
      songUrl: null,
    });
  });

  it("trims valid structured song metadata", () => {
    expect(
      normalizeSongMetadataFields({
        songTitle: "  Holocene  ",
        songArtist: "  Bon Iver ",
        songUrl: "https://open.spotify.com/track/123  ",
      }),
    ).toEqual({
      songTitle: "Holocene",
      songArtist: "Bon Iver",
      songUrl: "https://open.spotify.com/track/123",
    });
  });

  it("accepts a playable link without title or artist metadata", () => {
    expect(
      normalizeSongMetadataFields({
        songTitle: "",
        songArtist: " ",
        songUrl: "https://open.spotify.com/track/123",
      }),
    ).toEqual({
      songTitle: null,
      songArtist: null,
      songUrl: "https://open.spotify.com/track/123",
    });
  });

  it("rejects partial song metadata when the playable URL is missing", () => {
    expect(() =>
      normalizeSongMetadataFields({
        songTitle: "Holocene",
        songArtist: "",
        songUrl: "",
      }),
    ).toThrow("Invalid request");
  });

  it("rejects non-https song URLs", () => {
    expect(() =>
      normalizeSongMetadataFields({
        songTitle: "Holocene",
        songArtist: "Bon Iver",
        songUrl: "http://open.spotify.com/track/123",
      }),
    ).toThrow("Invalid request");
  });
});

describe("getSongMetadata", () => {
  it("returns a public song object for valid data", () => {
    expect(
      getSongMetadata({
        songTitle: "Holocene",
        songArtist: "Bon Iver",
        songUrl: "https://open.spotify.com/track/123",
      }),
    ).toEqual({
      title: "Holocene",
      artist: "Bon Iver",
      url: "https://open.spotify.com/track/123",
    });
  });

  it("returns a playable song object when only the URL is provided", () => {
    expect(
      getSongMetadata({
        songTitle: "",
        songArtist: "",
        songUrl: "https://open.spotify.com/track/123",
      }),
    ).toEqual({
      title: null,
      artist: null,
      url: "https://open.spotify.com/track/123",
    });
  });

  it("collapses invalid persisted data to null", () => {
    expect(
      getSongMetadata({
        songTitle: "Bad Song",
        songArtist: "Bad Artist",
        songUrl: "javascript:alert(1)",
      }),
    ).toBeNull();
  });
});
