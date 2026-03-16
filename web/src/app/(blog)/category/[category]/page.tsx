export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import Link from "next/link";

import { FilteredFeed } from "@/components/blog/filtered-feed";
import { SiteHeader } from "@/components/layout/site-header";
import { countPublishedPostsByCategory } from "@/server/dal/posts";
import { listPublishedPostsByCategory } from "@/server/queries/posts";

type CategoryPageProps = {
  params: Promise<{ category: string }>;
};

export async function generateMetadata({ params }: CategoryPageProps): Promise<Metadata> {
  const { category } = await params;
  const label = decodeURIComponent(category);
  return {
    title: `${label} – J²Adventures`,
    description: `Explore all ${label} adventures on J²Adventures.`,
  };
}

export default async function CategoryPage({ params }: CategoryPageProps) {
  const { category } = await params;
  const label = decodeURIComponent(category);
  const [initialPosts, postCount] = await Promise.all([
    listPublishedPostsByCategory(label, 20, 0),
    countPublishedPostsByCategory(label),
  ]);

  return (
    <div className="min-h-screen" style={{ background: "var(--background)" }}>
      <SiteHeader />

      {/* Category hero */}
      <div className="border-b border-[var(--border)]" style={{ background: "var(--card-bg)" }}>
        <div className="container mx-auto max-w-5xl px-4 pb-10 pt-28 sm:px-6 sm:pb-14 lg:px-8">
          <div className="flex items-start gap-4 sm:gap-6">

            {/* Folder icon badge */}
            <div className="mt-0.5 flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--accent-soft)] sm:h-14 sm:w-14">
              <svg aria-hidden="true" className="h-6 w-6 text-[var(--accent)] sm:h-7 sm:w-7" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} viewBox="0 0 24 24">
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
              </svg>
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold uppercase tracking-[0.3em] text-[var(--accent)]">Category</p>
              <h1 className="mt-1 text-balance text-3xl font-bold leading-tight text-[var(--text-primary)] sm:text-4xl lg:text-5xl">
                {label}
              </h1>

              <div className="mt-5 flex flex-wrap items-center gap-3 text-sm">
                <span className="font-semibold text-[var(--text-primary)]">
                  {postCount} {postCount === 1 ? "adventure" : "adventures"}
                </span>
                <span className="select-none text-[var(--border)]">·</span>
                <Link
                  className="font-medium text-[var(--accent)] underline-offset-2 hover:underline"
                  href="/"
                >
                  Browse all stories →
                </Link>
              </div>
            </div>

          </div>
        </div>
      </div>

      <FilteredFeed
        apiParams={{ category: label }}
        emptyDescription="No adventures have been posted in this category yet. Check back soon."
        emptyTitle={`No ${label} adventures yet.`}
        initialPosts={initialPosts}
      />
    </div>
  );
}
