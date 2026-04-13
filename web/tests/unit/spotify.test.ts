import { describe, expect, it } from "vitest";

import { getSpotifyEmbedHeight, parseSpotifyEmbedUrl } from "@/lib/spotify";

describe("parseSpotifyEmbedUrl", () => {
  it("parses canonical track URLs into canonical and embed URLs", () => {
    expect(parseSpotifyEmbedUrl("https://open.spotify.com/track/4bHsxqR3GMjc5K5kKkXmBl")).toEqual({
      kind: "track",
      id: "4bHsxqR3GMjc5K5kKkXmBl",
      canonicalUrl: "https://open.spotify.com/track/4bHsxqR3GMjc5K5kKkXmBl",
      embedUrl: "https://open.spotify.com/embed/track/4bHsxqR3GMjc5K5kKkXmBl?utm_source=generator&theme=0",
    });
  });

  it("parses album URLs and keeps them embeddable", () => {
    expect(parseSpotifyEmbedUrl("https://open.spotify.com/album/1ATL5GLyefJaxhQzSPVrLX")?.kind).toBe("album");
  });

  it("rejects URLs with query params, hashes, or credentials", () => {
    expect(parseSpotifyEmbedUrl("https://open.spotify.com/track/abc123?si=token")).toBeNull();
    expect(parseSpotifyEmbedUrl("https://open.spotify.com/track/abc123#frag")).toBeNull();
    expect(parseSpotifyEmbedUrl("https://user:pass@open.spotify.com/track/abc123")).toBeNull();
  });

  it("rejects unsupported hosts and invalid IDs", () => {
    expect(parseSpotifyEmbedUrl("https://spotify.com/track/abc123")).toBeNull();
    expect(parseSpotifyEmbedUrl("https://open.spotify.com/track/abc!123")).toBeNull();
  });
});

describe("getSpotifyEmbedHeight", () => {
  it("returns compact embeds for tracks and tall embeds for collections", () => {
    expect(getSpotifyEmbedHeight("track")).toBe(152);
    expect(getSpotifyEmbedHeight("playlist")).toBe(352);
    expect(getSpotifyEmbedHeight("album")).toBe(352);
  });
});
