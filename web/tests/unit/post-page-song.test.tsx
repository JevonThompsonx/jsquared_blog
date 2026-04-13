import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { PostSongMetadata } from "@/components/blog/post-song-metadata";

describe("PostSongMetadata", () => {
  describe("Spotify track URL", () => {
    it("renders an embedded Spotify iframe for a track URL", () => {
      const markup = renderToStaticMarkup(
        <PostSongMetadata
          song={{
            title: "Holocene",
            artist: "Bon Iver",
            url: "https://open.spotify.com/track/4bHsxqR3GMjc5K5kKkXmBl",
          }}
        />,
      );

      expect(markup).toContain("<iframe");
      expect(markup).toContain("open.spotify.com/embed/track/4bHsxqR3GMjc5K5kKkXmBl");
      expect(markup).toContain('title="Holocene by Bon Iver on Spotify"');
      // Should NOT render the old text-link fallback
      expect(markup).not.toContain('rel="noopener noreferrer"');
    });

    it("renders an embedded Spotify iframe for a playlist URL", () => {
      const markup = renderToStaticMarkup(
        <PostSongMetadata
          song={{
            title: "Road Trip Mix",
            artist: "Various",
            url: "https://open.spotify.com/playlist/37i9dQZF1DX4WYpdgoIcn6",
          }}
        />,
      );

      expect(markup).toContain("<iframe");
      expect(markup).toContain("open.spotify.com/embed/playlist/37i9dQZF1DX4WYpdgoIcn6");
    });

    it("uses the compact 152px height for tracks and larger 352px for playlists", () => {
      const trackMarkup = renderToStaticMarkup(
        <PostSongMetadata
          song={{ title: "T", artist: "A", url: "https://open.spotify.com/track/abc123" }}
        />,
      );
      const playlistMarkup = renderToStaticMarkup(
        <PostSongMetadata
          song={{ title: "P", artist: "A", url: "https://open.spotify.com/playlist/abc123" }}
        />,
      );

      expect(trackMarkup).toContain('height="152"');
      expect(playlistMarkup).toContain('height="352"');
    });

    it("renders a Spotify embed when the URL is present even without title or artist fields", () => {
      const markup = renderToStaticMarkup(
        <PostSongMetadata
          song={{ title: null, artist: null, url: "https://open.spotify.com/track/4bHsxqR3GMjc5K5kKkXmBl" }}
        />,
      );

      expect(markup).toContain("<iframe");
      expect(markup).toContain("Spotify player");
    });
  });

  describe("non-Spotify HTTPS URL", () => {
    it("renders safe song metadata links for a non-Spotify HTTPS link", () => {
      const markup = renderToStaticMarkup(
        <PostSongMetadata
          song={{
            title: "Holocene",
            artist: "Bon Iver",
            url: "https://music.example.com/track/123",
          }}
        />,
      );

      expect(markup).toContain("Holocene");
      expect(markup).toContain("Bon Iver");
      expect(markup).toContain('href="https://music.example.com/track/123"');
      expect(markup).toContain('target="_blank"');
      expect(markup).toContain('rel="noopener noreferrer"');
      expect(markup).toContain('aria-label="Listen to Holocene by Bon Iver"');
      // Should NOT render an iframe for non-Spotify URLs
      expect(markup).not.toContain("<iframe");
    });

    it("renders a generic external-player link when only a non-Spotify URL is available", () => {
      const markup = renderToStaticMarkup(
        <PostSongMetadata
          song={{ title: null, artist: null, url: "https://music.example.com/track/123" }}
        />,
      );

      expect(markup).toContain('href="https://music.example.com/track/123"');
      expect(markup).toContain("Open audio link");
      expect(markup).not.toContain("<iframe");
    });
  });

  describe("invalid metadata", () => {
    it("does not render incomplete or unsafe song metadata", () => {
      const incompleteMarkup = renderToStaticMarkup(
        <PostSongMetadata
          song={{
            title: "Bad Song",
            artist: "",
            url: "javascript:alert(1)",
          }}
        />,
      );

      expect(incompleteMarkup).not.toContain("Bad Song");
      expect(incompleteMarkup).not.toContain("javascript:alert(1)");
    });

    it("renders nothing for a null song", () => {
      expect(renderToStaticMarkup(<PostSongMetadata song={null} />)).toBe("");
    });
  });

  describe("song label", () => {
    it("shows 'Vibes for this story' as the label instead of 'Song for this story'", () => {
      const markup = renderToStaticMarkup(
        <PostSongMetadata
          song={{
            title: "Holocene",
            artist: "Bon Iver",
            url: "https://open.spotify.com/track/4bHsxqR3GMjc5K5kKkXmBl",
          }}
        />,
      );

      expect(markup).toContain("Vibes for this story");
      expect(markup).not.toContain("Song for this story");
    });

    it("shows 'Vibes for this story' on the fallback text-link layout too", () => {
      const markup = renderToStaticMarkup(
        <PostSongMetadata
          song={{
            title: "Holocene",
            artist: "Bon Iver",
            url: "https://music.example.com/track/123",
          }}
        />,
      );

      expect(markup).toContain("Vibes for this story");
      expect(markup).not.toContain("Song for this story");
    });
  });
});
