import type { PostLink } from "@/server/dal/post-links";

function getDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export function PostLinks({
  links,
  iovanderUrl,
}: {
  links: PostLink[];
  iovanderUrl?: string | null;
}) {
  // Use post_links if available, otherwise fall back to iovanderUrl for backward compat.
  const items: Array<{ label: string; url: string }> =
    links.length > 0
      ? links.map((l) => ({ label: l.label || getDomain(l.url), url: l.url }))
      : iovanderUrl
        ? [{ label: "iOverlander", url: iovanderUrl }]
        : [];

  if (items.length === 0) {
    return null;
  }

  return (
    <div className="not-prose mt-6 flex flex-wrap gap-2">
      {items.map((item) => (
        <a
          key={item.url}
          className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--background)] px-3 py-1.5 text-sm font-semibold text-[var(--accent)] transition-colors hover:border-[var(--primary)] hover:bg-[var(--accent-soft)]"
          href={item.url}
          rel="noopener noreferrer"
          target="_blank"
        >
          {/* Link icon */}
          <svg
            aria-hidden="true"
            className="h-3.5 w-3.5 shrink-0"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
          </svg>
          {item.label}
        </a>
      ))}
    </div>
  );
}
