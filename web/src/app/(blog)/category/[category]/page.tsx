export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import Link from "next/link";
import type { SVGProps } from "react";

import { FilteredFeed } from "@/components/blog/filtered-feed";
import { SiteHeader } from "@/components/layout/site-header";
import { getCategoryFeedHref } from "@/lib/utils";
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
    alternates: {
      types: {
        "application/rss+xml": `https://jsquaredadventures.com${getCategoryFeedHref(label)}`,
      },
    },
  };
}

function getCategorySlug(name: string): string {
  return name.toLowerCase().replace(/\s+/g, "-");
}

function CategoryIcon({ slug }: { slug: string }) {
  const cls = "h-6 w-6 text-[var(--accent)] sm:h-7 sm:w-7";
  const base: SVGProps<SVGSVGElement> = {
    "aria-hidden": true,
    className: cls,
    fill: "none",
    stroke: "currentColor",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    strokeWidth: 2,
    viewBox: "0 0 24 24",
  };

  switch (slug) {
    case "hiking":
      return (
        <svg {...base}>
          {/* Mountain peak */}
          <polygon points="12 3 3 21 21 21" />
          <polyline points="12 9 9 15 15 15" />
        </svg>
      );
    case "van-life":
      return (
        <svg {...base}>
          {/* Van / truck */}
          <rect height="9" rx="2" width="16" x="1" y="11" />
          <path d="M17 11l4 4v5h-4" />
          <circle cx="5.5" cy="20.5" r="1.5" />
          <circle cx="13.5" cy="20.5" r="1.5" />
          <path d="M5 11V7a2 2 0 0 1 2-2h6l3 4" />
        </svg>
      );
    case "international":
      return (
        <svg {...base}>
          {/* Globe */}
          <circle cx="12" cy="12" r="9" />
          <path d="M12 3c-2.5 2.5-4 5.5-4 9s1.5 6.5 4 9c2.5-2.5 4-5.5 4-9s-1.5-6.5-4-9z" />
          <line x1="3" x2="21" y1="12" y2="12" />
          <line x1="12" x2="12" y1="3" y2="21" />
        </svg>
      );
    case "gear":
      return (
        <svg {...base}>
          {/* Settings cog */}
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
      );
    case "camping":
      return (
        <svg {...base}>
          {/* Tent */}
          <path d="M12 2L2 22h20L12 2z" />
          <path d="M9.5 22L12 14l2.5 8" />
        </svg>
      );
    case "road-trips":
      return (
        <svg {...base}>
          {/* Map with fold */}
          <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21" />
          <line x1="9" x2="9" y1="3" y2="18" />
          <line x1="15" x2="15" y1="6" y2="21" />
        </svg>
      );
    default:
      return (
        <svg {...base}>
          {/* Folder */}
          <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
        </svg>
      );
  }
}

export default async function CategoryPage({ params }: CategoryPageProps) {
  const { category } = await params;
  const label = decodeURIComponent(category);
  const slug = getCategorySlug(label);
  const [initialPosts, postCount] = await Promise.all([
    listPublishedPostsByCategory(label, 20, 0),
    countPublishedPostsByCategory(label),
  ]);

  return (
    <main id="main-content" className="min-h-screen" style={{ background: "var(--background)" }} tabIndex={-1}>
      <SiteHeader />

      {/* Category hero */}
      <div className="border-b border-[var(--border)]" style={{ background: "var(--card-bg)" }}>
        <div className="container mx-auto max-w-5xl px-4 pb-10 pt-28 sm:px-6 sm:pb-14 lg:px-8">
          <div className="flex items-start gap-4 sm:gap-6">

            {/* Category icon badge */}
            <div className="group/badge mt-0.5 flex h-12 w-12 shrink-0 cursor-default items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--accent-soft)] shadow-sm transition-all duration-200 hover:scale-110 hover:border-[var(--primary)] hover:shadow-md sm:h-14 sm:w-14">
              <CategoryIcon slug={slug} />
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
                  className="inline-flex items-center gap-1 rounded-full border border-[var(--border)] px-3 py-1 text-xs font-medium text-[var(--text-secondary)] transition-colors hover:border-[var(--primary)] hover:bg-[var(--accent-soft)] hover:text-[var(--accent)]"
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
    </main>
  );
}
