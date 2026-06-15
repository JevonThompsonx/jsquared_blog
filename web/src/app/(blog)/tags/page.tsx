export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import Link from "next/link";

import { SiteHeader } from "@/components/layout/site-header";
import { getTagHref } from "@/lib/utils";
import { listAllTagsForBrowse, type TagWithCount } from "@/server/dal/taxonomy-browse";

export const metadata: Metadata = {
  title: "Tags – J²Adventures",
  description: "Browse all tags used across J²Adventures. Find every story filed under the themes that match your next adventure.",
};

function getTotalTagCount(tags: TagWithCount[]): number {
  return tags.reduce((sum, tag) => sum + tag.postCount, 0);
}

function getPostCountLabel(count: number): string {
  return count === 1 ? "1 adventure" : `${count} adventures`;
}

export default async function TagsPage() {
  const tags = await listAllTagsForBrowse();
  const totalCount = getTotalTagCount(tags);
  const hasTags = tags.length > 0;

  return (
    <main id="main-content" className="min-h-screen" style={{ background: "var(--background)" }} tabIndex={-1}>
      <SiteHeader />

      {/* Tags hero */}
      <div className="border-b border-[var(--border)]" style={{ background: "var(--card-bg)" }}>
        <div className="container mx-auto max-w-5xl px-4 pb-10 pt-28 sm:px-6 sm:pb-14 lg:px-8">
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-[var(--accent)]">Tags</p>
          <h1 className="mt-1 text-balance text-3xl font-bold leading-tight text-[var(--text-primary)] sm:text-4xl lg:text-5xl">
            Explore by tag
          </h1>
          <p className="mt-3 max-w-2xl text-base leading-relaxed text-[var(--text-secondary)]">
            Every adventure on J²Adventures is tagged with the themes and ideas that shape it. Pick a tag to see every story we have filed under that label.
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-3 text-sm">
            <span className="font-semibold text-[var(--text-primary)]">
              {tags.length} {tags.length === 1 ? "tag" : "tags"}
            </span>
            {hasTags ? (
              <>
                <span className="select-none text-[var(--border)]">·</span>
                <span className="text-[var(--text-secondary)]">
                  {getPostCountLabel(totalCount)} total
                </span>
              </>
            ) : null}
          </div>
        </div>
      </div>

      {/* Tag grid */}
      <section aria-label="All tags" className="container mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
        {hasTags ? (
          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3" data-testid="tags-grid">
            {tags.map((tag) => (
              <li key={tag.id}>
                <Link
                  className="group flex h-full flex-col gap-3 rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-5 shadow-[var(--shadow)] transition-all duration-200 hover:-translate-y-0.5 hover:border-[var(--primary)] hover:shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]"
                  data-tag-slug={tag.slug}
                  href={getTagHref(tag.slug)}
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--accent-soft)]">
                      <span aria-hidden="true" className="text-lg font-black text-[var(--accent)]">#</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <h2 className="text-base font-bold text-[var(--text-primary)] group-hover:text-[var(--primary)]">
                        {tag.name}
                      </h2>
                      <p className="mt-0.5 text-xs font-medium text-[var(--text-secondary)]">
                        {getPostCountLabel(tag.postCount)}
                      </p>
                    </div>
                  </div>
                  {tag.description ? (
                    <p className="line-clamp-3 text-sm leading-relaxed text-[var(--text-secondary)]">
                      {tag.description}
                    </p>
                  ) : (
                    <p className="text-sm italic text-[var(--text-secondary)]/70">No description yet.</p>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-8 text-center shadow-[var(--shadow)] sm:p-10">
            <p className="text-base font-semibold text-[var(--text-primary)]">No tags yet</p>
            <p className="mt-2 text-sm leading-relaxed text-[var(--text-secondary)]">
              Tags will appear here once adventures are published and labeled.
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
