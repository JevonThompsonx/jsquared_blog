export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import Link from "next/link";

import { SiteHeader } from "@/components/layout/site-header";
import { absoluteUrl } from "@/lib/seo";
import { getSeriesHref } from "@/lib/utils";
import {
  listAllSeries,
  listPublishedPostsInSeries,
  type SeriesRecord,
} from "@/server/dal/series";

type SeriesWithCount = SeriesRecord & { postCount: number };

export const metadata: Metadata = {
  title: "Series",
  description:
    "Browse every multi-part series on J²Adventures — long-form adventure runs collected in reading order.",
  alternates: { canonical: absoluteUrl("/series") },
};

function getPostCountLabel(count: number): string {
  return count === 1 ? "1 adventure" : `${count} adventures`;
}

async function attachPostCounts(
  seriesList: SeriesRecord[],
): Promise<SeriesWithCount[]> {
  return Promise.all(
    seriesList.map(async (series) => {
      const posts = await listPublishedPostsInSeries(series.id);

      return { ...series, postCount: posts.length };
    }),
  );
}

export default async function SeriesIndexPage() {
  const seriesList = await attachPostCounts(await listAllSeries());
  const hasSeries = seriesList.length > 0;

  return (
    <main
      id="main-content"
      className="min-h-screen"
      style={{ background: "var(--background)" }}
      tabIndex={-1}
    >
      <SiteHeader />

      {/* Series hero */}
      <div
        className="border-b border-[var(--border)]"
        style={{ background: "var(--card-bg)" }}
      >
        <div className="container mx-auto max-w-5xl px-4 pb-10 pt-28 sm:px-6 sm:pb-14 lg:px-8">
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-[var(--accent)]">
            Series
          </p>
          <h1 className="mt-1 text-balance text-3xl font-bold leading-tight text-[var(--text-primary)] sm:text-4xl lg:text-5xl">
            Read the long way round
          </h1>
          <p className="mt-3 max-w-2xl text-base leading-relaxed text-[var(--text-secondary)]">
            Some adventures are too big for a single story. These series collect
            every part in reading order, from the first mile to the last camp.
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-3 text-sm">
            <span className="font-semibold text-[var(--text-primary)]">
              {seriesList.length}{" "}
              {seriesList.length === 1 ? "series" : "series"}
            </span>
          </div>
        </div>
      </div>

      {/* Series grid */}
      <section
        aria-label="All series"
        className="container mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8"
      >
        {hasSeries ? (
          <ul
            className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
            data-testid="series-grid"
          >
            {seriesList.map((series) => (
              <li key={series.id}>
                <Link
                  className="group flex h-full flex-col gap-3 rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-5 shadow-[var(--shadow)] transition-all duration-200 hover:-translate-y-0.5 hover:border-[var(--primary)] hover:shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]"
                  data-series-slug={series.slug}
                  href={getSeriesHref(series.slug)}
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--accent-soft)]">
                      <svg
                        aria-hidden="true"
                        className="h-5 w-5 text-[var(--accent)]"
                        fill="none"
                        stroke="currentColor"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        viewBox="0 0 24 24"
                      >
                        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                      </svg>
                    </div>
                    <div className="min-w-0 flex-1">
                      <h2 className="text-base font-bold text-[var(--text-primary)] group-hover:text-[var(--primary)]">
                        {series.title}
                      </h2>
                      <p className="mt-0.5 text-xs font-medium text-[var(--text-secondary)]">
                        {getPostCountLabel(series.postCount)}
                      </p>
                    </div>
                  </div>
                  {series.description ? (
                    <p className="line-clamp-3 text-sm leading-relaxed text-[var(--text-secondary)]">
                      {series.description}
                    </p>
                  ) : (
                    <p className="text-sm italic text-[var(--text-secondary)]/70">
                      No description yet.
                    </p>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-8 text-center shadow-[var(--shadow)] sm:p-10">
            <p className="text-base font-semibold text-[var(--text-primary)]">
              No series yet
            </p>
            <p className="mt-2 text-sm leading-relaxed text-[var(--text-secondary)]">
              Series will appear here once adventures are published as
              multi-part stories.
            </p>
            <Link
              className="mt-6 inline-flex items-center justify-center rounded-full border border-[var(--accent)] px-5 py-2.5 text-sm font-semibold text-[var(--accent)] transition-colors hover:bg-[var(--accent-soft)]"
              href="/"
            >
              Back to stories
            </Link>
          </div>
        )}
      </section>
    </main>
  );
}
