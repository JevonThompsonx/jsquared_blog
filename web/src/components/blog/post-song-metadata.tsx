import type { BlogSongMetadata } from "@/types/blog";

type SpotifyEmbedInfo =
  | { kind: "track"; id: string }
  | { kind: "playlist"; id: string }
  | null;

/**
 * Detect a Spotify track or playlist URL and return the embed type + ID.
 * Handles both long-form (open.spotify.com/track/<id>) and short-form
 * (spotify.com/…) variants including query-string suffixes.
 */
function parseSpotifyUrl(url: string): SpotifyEmbedInfo {
  try {
    const parsed = new URL(url);
    if (!parsed.hostname.endsWith("spotify.com")) return null;
    const segments = parsed.pathname.split("/").filter(Boolean);
    // segments: ["track", "<id>"] or ["playlist", "<id>"] etc.
    const type = segments[0];
    const id = segments[1];
    if (!id) return null;
    if (type === "track") return { kind: "track", id };
    if (type === "playlist") return { kind: "playlist", id };
    return null;
  } catch {
    return null;
  }
}

function isRenderableSong(song: BlogSongMetadata | null | undefined): song is BlogSongMetadata {
  if (!song) {
    return false;
  }

  if (!song.title.trim() || !song.artist.trim()) {
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

  const spotifyEmbed = parseSpotifyUrl(song.url);

  if (spotifyEmbed) {
    const embedSrc = `https://open.spotify.com/embed/${spotifyEmbed.kind}/${spotifyEmbed.id}?utm_source=generator&theme=0`;

    return (
      <section className="mx-auto mb-8 max-w-[68ch] rounded-2xl border border-[var(--border)] bg-[var(--accent-soft)]/40 px-4 py-4 sm:px-5">
        <p className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-[var(--accent)]">Song for this story</p>
        <iframe
          allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
          allowFullScreen
          className="w-full rounded-xl"
          height={spotifyEmbed.kind === "playlist" ? 352 : 152}
          loading="lazy"
          src={embedSrc}
          title={`${song.title} by ${song.artist} on Spotify`}
        />
      </section>
    );
  }

  // Non-Spotify URL: keep the original text + link layout.
  return (
    <section className="mx-auto mb-8 max-w-[68ch] rounded-2xl border border-[var(--border)] bg-[var(--accent-soft)]/40 px-4 py-4 sm:px-5">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--accent)]">Song for this story</p>
      <div className="mt-2 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-base font-semibold text-[var(--text-primary)]">{song.title}</p>
          <p className="text-sm text-[var(--text-secondary)]">{song.artist}</p>
        </div>
        <a
          className="text-sm font-semibold text-[var(--accent)] hover:underline"
          aria-label={`Listen to ${song.title} by ${song.artist}`}
          href={song.url}
          rel="noopener noreferrer"
          target="_blank"
        >
          Listen
        </a>
      </div>
    </section>
  );
}
