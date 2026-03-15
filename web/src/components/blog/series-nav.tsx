import Link from "next/link";

import type { SeriesNavResult } from "@/server/dal/series";
import { getPostHref, getSeriesHref } from "@/lib/utils";

export function SeriesNav({ nav }: { nav: SeriesNavResult }) {
  const { series, order, totalParts, prevPost, nextPost } = nav;

  return (
    <div className="mb-8 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--accent-soft)]">
      {/* Series header */}
      <div className="flex items-center justify-between gap-4 px-5 py-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--accent)]">Part {order} of {totalParts}</p>
          <Link
            className="mt-0.5 block text-base font-bold text-[var(--text-primary)] hover:text-[var(--accent)] hover:underline"
            href={getSeriesHref(series.slug)}
          >
            {series.title}
          </Link>
        </div>
        <Link
          className="shrink-0 rounded-full border border-[var(--border)] bg-[var(--card-bg)] px-3 py-1.5 text-xs font-semibold text-[var(--text-secondary)] transition-colors hover:border-[var(--primary)] hover:text-[var(--primary)]"
          href={getSeriesHref(series.slug)}
        >
          All parts →
        </Link>
      </div>

      {/* Prev / Next navigation */}
      {(prevPost ?? nextPost) ? (
        <div className="grid grid-cols-2 border-t border-[var(--border)]">
          <div className="border-r border-[var(--border)] p-4">
            {prevPost ? (
              <Link className="group flex flex-col gap-1" href={getPostHref(prevPost)}>
                <span className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--text-secondary)] group-hover:text-[var(--accent)]">
                  ← Previous
                </span>
                <span className="line-clamp-2 text-sm font-medium leading-snug text-[var(--text-primary)] group-hover:text-[var(--accent)]">
                  {prevPost.title}
                </span>
              </Link>
            ) : (
              <span className="text-xs text-[var(--text-secondary)]">First in series</span>
            )}
          </div>
          <div className="p-4 text-right">
            {nextPost ? (
              <Link className="group flex flex-col items-end gap-1" href={getPostHref(nextPost)}>
                <span className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--text-secondary)] group-hover:text-[var(--accent)]">
                  Next →
                </span>
                <span className="line-clamp-2 text-sm font-medium leading-snug text-[var(--text-primary)] group-hover:text-[var(--accent)]">
                  {nextPost.title}
                </span>
              </Link>
            ) : (
              <span className="text-xs text-[var(--text-secondary)]">Last in series</span>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
