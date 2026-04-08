import type { BlogSongMetadata } from "@/types/blog";

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
