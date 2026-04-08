import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { PostSongMetadata } from "@/components/blog/post-song-metadata";

describe("PostSongMetadata", () => {
  it("renders safe song metadata links for valid structured metadata", () => {
    const markup = renderToStaticMarkup(
      <PostSongMetadata
        song={{
          title: "Holocene",
          artist: "Bon Iver",
          url: "https://open.spotify.com/track/123",
        }}
      />,
    );

    expect(markup).toContain("Holocene");
    expect(markup).toContain("Bon Iver");
    expect(markup).toContain('href="https://open.spotify.com/track/123"');
    expect(markup).toContain('target="_blank"');
    expect(markup).toContain('rel="noopener noreferrer"');
    expect(markup).toContain('aria-label="Listen to Holocene by Bon Iver"');
  });

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
});
