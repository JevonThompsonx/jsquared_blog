export const dynamic = "force-dynamic";

import type { Metadata } from "next";

import { FilteredFeed } from "@/components/blog/filtered-feed";
import { SiteHeader } from "@/components/layout/site-header";
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
  const initialPosts = await listPublishedPostsByCategory(label, 20, 0);

  return (
    <div className="min-h-screen" style={{ background: "var(--background)" }}>
      <SiteHeader />
      <div className="container mx-auto px-4 pb-4 pt-28 sm:px-6 lg:px-8">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[var(--accent)]">Category</p>
        <h1 className="mt-1 text-3xl font-semibold text-[var(--text-primary)] sm:text-4xl">{label}</h1>
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
