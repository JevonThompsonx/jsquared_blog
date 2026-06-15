export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import Link from "next/link";

import { SiteHeader } from "@/components/layout/site-header";
import { getCategoryHref } from "@/lib/utils";
import { listAllCategoriesForBrowse, type CategoryWithCount } from "@/server/dal/taxonomy-browse";

export const metadata: Metadata = {
  title: "Categories – J²Adventures",
  description: "Browse every category on J²Adventures. Find the kind of trip you want to plan next — from hiking to road trips to international travel.",
};

function getPostCountLabel(count: number): string {
  return count === 1 ? "1 adventure" : `${count} adventures`;
}

function getCategorySlug(slug: string): string {
  return slug;
}

export default async function CategoriesPage() {
  const categories = await listAllCategoriesForBrowse();
  const hasCategories = categories.length > 0;
  const totalAdventures = categories.reduce((sum: number, category: CategoryWithCount) => sum + category.postCount, 0);

  return (
    <main id="main-content" className="min-h-screen" style={{ background: "var(--background)" }} tabIndex={-1}>
      <SiteHeader />

      {/* Categories hero */}
      <div className="border-b border-[var(--border)]" style={{ background: "var(--card-bg)" }}>
        <div className="container mx-auto max-w-5xl px-4 pb-10 pt-28 sm:px-6 sm:pb-14 lg:px-8">
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-[var(--text-secondary)]">Categories</p>
          <h1 className="mt-1 text-balance text-3xl font-bold leading-tight text-[var(--text-primary)] sm:text-4xl lg:text-5xl">
            Explore by category
          </h1>
          <p className="mt-3 max-w-2xl text-base leading-relaxed text-[var(--text-secondary)]">
            Categories group every adventure on J²Adventures by the kind of trip it is. Pick a category to see every story we have filed under that umbrella.
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-3 text-sm">
            <span className="font-semibold text-[var(--text-primary)]">
              {categories.length} {categories.length === 1 ? "category" : "categories"}
            </span>
            {hasCategories ? (
              <>
                <span className="select-none text-[var(--border)]">·</span>
                <span className="text-[var(--text-secondary)]">
                  {getPostCountLabel(totalAdventures)} total
                </span>
              </>
            ) : null}
          </div>
        </div>
      </div>

      {/* Category grid */}
      <section aria-label="All categories" className="container mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
        {hasCategories ? (
          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3" data-testid="categories-grid">
            {categories.map((category) => (
              <li key={category.id}>
                <Link
                  className="group flex h-full flex-col gap-3 rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-5 shadow-[var(--shadow)] transition-all duration-200 hover:-translate-y-0.5 hover:border-[var(--primary)] hover:shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]"
                  data-category-slug={category.slug}
                  href={getCategoryHref(getCategorySlug(category.slug))}
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
                        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                      </svg>
                    </div>
                    <div className="min-w-0 flex-1">
                      <h2 className="text-base font-bold text-[var(--text-primary)] group-hover:text-[var(--primary)]">
                        {category.name}
                      </h2>
                      <p className="mt-0.5 text-xs font-medium text-[var(--text-secondary)]">
                        {getPostCountLabel(category.postCount)}
                      </p>
                    </div>
                  </div>
                  {category.description ? (
                    <p className="line-clamp-3 text-sm leading-relaxed text-[var(--text-secondary)]">
                      {category.description}
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
            <p className="text-base font-semibold text-[var(--text-primary)]">No categories yet</p>
            <p className="mt-2 text-sm leading-relaxed text-[var(--text-secondary)]">
              Categories will appear here once adventures are published and grouped.
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
