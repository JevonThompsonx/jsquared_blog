export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import Link from "next/link";
import { z } from "zod";

import { FilteredFeed } from "@/components/blog/filtered-feed";
import { SearchInput } from "@/components/blog/search-input";
import { SiteHeader } from "@/components/layout/site-header";
import { listPublishedPosts } from "@/server/queries/posts";

const SEARCH_SUGGESTIONS = ["Sierra", "Winter", "Oregon", "Road trip"];

const searchParamsSchema = z.object({
  q: z.string().trim().max(200).optional(),
});

type SearchPageProps = {
  searchParams?: Promise<{ q?: string }>;
};

export const metadata: Metadata = {
  title: "Search – J²Adventures",
  description: "Search every adventure on J²Adventures by place, season, tag, or keyword.",
};

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const parsed = searchParamsSchema.safeParse(resolvedSearchParams ?? {});
  const rawQuery = parsed.success ? parsed.data.q ?? "" : "";
  const query = rawQuery.trim();

  const posts = await listPublishedPosts(20, 0, query);
  const hasMatches = posts.length > 0;
  const trimmedQueryForDisplay = rawQuery.trim();

  return (
    <main id="main-content" className="min-h-screen" style={{ background: "var(--background)" }} tabIndex={-1}>
      <SiteHeader />

      <div className="border-b border-[var(--border)]" style={{ background: "var(--card-bg)" }}>
        <div className="container mx-auto max-w-5xl px-4 pb-10 pt-28 sm:px-6 sm:pb-14 lg:px-8">
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-[var(--accent)]">Search</p>
          <h1 className="mt-1 text-balance text-3xl font-bold leading-tight text-[var(--text-primary)] sm:text-4xl lg:text-5xl">
            {query ? (hasMatches ? `Results for “${trimmedQueryForDisplay}”` : `No results for “${trimmedQueryForDisplay}”`) : "Search adventures"}
          </h1>
          <p className="mt-3 max-w-2xl text-base leading-relaxed text-[var(--text-secondary)]">
            {query
              ? hasMatches
                ? "Refine the phrase below or jump into a nearby trail of stories."
                : "Try a place name, a season, or a road-trip keyword to widen the trail."
              : "Look for a place, season, tag, or keyword to find your next adventure."}
          </p>

          <div className="mt-6">
            <SearchInput
              initialValue={trimmedQueryForDisplay}
              placeholder="Search stories… (⌘K)"
              showSuggestions={!query || !hasMatches}
              suggestions={SEARCH_SUGGESTIONS}
            />
          </div>

          {!query ? (
            <div className="mt-5 flex flex-wrap items-center gap-3 text-sm">
              <Link
                className="font-medium text-[var(--accent)] underline-offset-2 hover:underline"
                href="/"
              >
                Browse all stories →
              </Link>
            </div>
          ) : null}
        </div>
      </div>

      {query ? (
        <FilteredFeed
          apiParams={{ search: query }}
          emptyDescription="Try a place name, a season, or a road-trip keyword to widen the trail."
          emptyTitle={`No results for “${trimmedQueryForDisplay}”.`}
          initialPosts={posts}
        />
      ) : (
        <FilteredFeed
          apiParams={{}}
          emptyDescription="Search for a place, season, tag, or keyword to see matching stories."
          emptyTitle="Start with a search above."
          initialPosts={posts}
        />
      )}
    </main>
  );
}
