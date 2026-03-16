export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { FilteredFeed } from "@/components/blog/filtered-feed";
import { SiteHeader } from "@/components/layout/site-header";
import { getTagBySlug } from "@/server/dal/posts";
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
  };
}

export default async function TagPage({ params }: TagPageProps) {
  const { slug } = await params;
  const [tag, initialPosts] = await Promise.all([
    getTagBySlug(slug),
    listPublishedPostsByTagSlug(slug, 20, 0),
  ]);

  if (!tag) {
    notFound();
  }

  return (
    <div className="min-h-screen" style={{ background: "var(--background)" }}>
      <SiteHeader />
      <div className="container mx-auto px-4 pb-4 pt-28 sm:px-6 lg:px-8">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[var(--accent)]">Tag</p>
        <h1 className="mt-1 text-3xl font-semibold text-[var(--text-primary)] sm:text-4xl">{tag.name}</h1>
        {tag.description ? (
          <p className="mt-3 max-w-2xl text-base leading-relaxed text-[var(--text-secondary)]">{tag.description}</p>
        ) : null}
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
