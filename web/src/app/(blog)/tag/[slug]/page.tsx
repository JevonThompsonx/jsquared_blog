export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { FilteredFeed } from "@/components/blog/filtered-feed";
import { SiteHeader } from "@/components/layout/site-header";
import { getTagFeedHref } from "@/lib/utils";
import { countPublishedPostsByTagSlug, getTagBySlug } from "@/server/dal/posts";
import { listPublishedPostsByTagSlug } from "@/server/queries/posts";

type TagPageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: TagPageProps): Promise<Metadata> {
  const { slug } = await params;
  const tag = await getTagBySlug(slug);
  if (!tag) {
    return {};
  }
  const description = tag.description ?? `Explore all adventures tagged "${tag.name}" on J²Adventures.`;
  return {
    title: `${tag.name} – J²Adventures`,
    description,
    alternates: {
      types: {
        "application/rss+xml": `https://jsquaredadventures.com${getTagFeedHref(tag.slug)}`,
      },
    },
  };
}

export default async function TagPage({ params }: TagPageProps) {
  const { slug } = await params;
  const [tag, initialPosts, postCount] = await Promise.all([
    getTagBySlug(slug),
    listPublishedPostsByTagSlug(slug, 20, 0),
    countPublishedPostsByTagSlug(slug),
  ]);

  if (!tag) {
    notFound();
  }

  return (
    <div className="min-h-screen" style={{ background: "var(--background)" }}>
      <SiteHeader />

      {/* Tag hero */}
      <div className="border-b border-[var(--border)]" style={{ background: "var(--card-bg)" }}>
        <div className="container mx-auto max-w-5xl px-4 pb-10 pt-28 sm:px-6 sm:pb-14 lg:px-8">
          <div className="flex items-start gap-4 sm:gap-6">

            {/* # badge */}
            <div className="mt-0.5 flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--accent-soft)] sm:h-14 sm:w-14">
              <span className="text-xl font-black text-[var(--accent)] sm:text-2xl">#</span>
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold uppercase tracking-[0.3em] text-[var(--accent)]">Tag</p>
              <h1 className="mt-1 text-balance text-3xl font-bold leading-tight text-[var(--text-primary)] sm:text-4xl lg:text-5xl">
                {tag.name}
              </h1>

              {tag.description ? (
                <p className="mt-3 max-w-2xl text-base leading-relaxed text-[var(--text-secondary)]">
                  {tag.description}
                </p>
              ) : null}

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
        apiParams={{ tag: slug }}
        emptyDescription="No adventures have been tagged with this label yet. Check back soon."
        emptyTitle={`No adventures tagged "${tag.name}" yet.`}
        initialPosts={initialPosts}
      />
    </div>
  );
}
