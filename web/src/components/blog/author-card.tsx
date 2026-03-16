import Link from "next/link";

import type { PublicAuthorProfile } from "@/server/dal/profiles";

function getInitials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

export function AuthorCard({ author }: { author: PublicAuthorProfile }) {
  const initials = getInitials(author.displayName);
  const isPreset = author.avatarUrl?.startsWith("j2:");

  return (
    <div className="flex items-start gap-4 rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-5 shadow-sm">
      {/* Avatar */}
      <Link
        aria-label={`View ${author.displayName}'s profile`}
        className="relative shrink-0"
        href={`/author/${author.userId}`}
      >
        {author.avatarUrl && !isPreset ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            alt={author.displayName}
            className="h-14 w-14 rounded-full object-cover ring-2 ring-[var(--border)]"
            src={author.avatarUrl}
          />
        ) : (
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--accent-soft)] text-lg font-bold text-[var(--accent)] ring-2 ring-[var(--border)]">
            {initials}
          </div>
        )}
      </Link>

      {/* Info */}
      <div className="min-w-0">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--accent)]">Written by</p>
        <Link
          className="mt-0.5 block text-base font-bold text-[var(--text-primary)] hover:underline"
          href={`/author/${author.userId}`}
        >
          {author.displayName}
        </Link>
        {author.bio ? (
          <p className="mt-1 text-sm leading-relaxed text-[var(--text-secondary)]">{author.bio}</p>
        ) : null}
      </div>
    </div>
  );
}
