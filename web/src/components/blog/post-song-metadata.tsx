import type { BlogSongMetadata } from "@/types/blog";

import { getSpotifyEmbedHeight, parseSpotifyEmbedUrl } from "@/lib/spotify";

function isRenderableSong(song: BlogSongMetadata | null | undefined): song is BlogSongMetadata {
  if (!song) {
    return false;
  }

  try {
    const parsed = new URL(song.url);
    return parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export function PostSongMetadata({ song }: { song: BlogSongMetadata | null }) {
  if (!isRenderableSong(song)) {
    return null;
  }

  const spotifyEmbed = parseSpotifyEmbedUrl(song.url);
  const hasDisplayMetadata = Boolean(song.title?.trim() && song.artist?.trim());
  const songLabel = hasDisplayMetadata
    ? `${song.title} by ${song.artist} on Spotify`
    : "Spotify player";

  if (spotifyEmbed) {
    return (
      <section className="mx-auto mb-8 max-w-[68ch] rounded-2xl border border-[var(--border)] bg-[var(--accent-soft)]/40 px-4 py-4 sm:px-5">
        <p className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-[var(--accent)]">Now playing</p>
        {hasDisplayMetadata ? (
          <div className="mb-3">
            <p className="text-base font-semibold text-[var(--text-primary)]">{song.title}</p>
            <p className="text-sm text-[var(--text-secondary)]">{song.artist}</p>
          </div>
        ) : null}
        <iframe
          allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
          className="w-full rounded-xl"
          height={getSpotifyEmbedHeight(spotifyEmbed.kind)}
          loading="lazy"
          src={spotifyEmbed.embedUrl}
          title={songLabel}
        />
      </section>
    );
  }

  // Non-Spotify URL: keep the original text + link layout.
  return (
    <section className="mx-auto mb-8 max-w-[68ch] rounded-2xl border border-[var(--border)] bg-[var(--accent-soft)]/40 px-4 py-4 sm:px-5">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--accent)]">Now playing</p>
      <div className="mt-2 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        {hasDisplayMetadata ? (
          <div>
            <p className="text-base font-semibold text-[var(--text-primary)]">{song.title}</p>
            <p className="text-sm text-[var(--text-secondary)]">{song.artist}</p>
          </div>
        ) : (
          <p className="text-sm text-[var(--text-secondary)]">External audio link</p>
        )}
        <a
          className="text-sm font-semibold text-[var(--accent)] hover:underline"
          aria-label={hasDisplayMetadata ? `Listen to ${song.title} by ${song.artist}` : "Open audio link"}
          href={song.url}
          rel="noopener noreferrer"
          target="_blank"
        >
          {hasDisplayMetadata ? "Listen" : "Open audio link"}
        </a>
      </div>
    </section>
  );
}
