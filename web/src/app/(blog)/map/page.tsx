export const dynamic = "force-dynamic";

import type { Metadata } from "next";

import { SiteHeader } from "@/components/layout/site-header";
import { WorldMap } from "@/components/blog/world-map";
import { getPublicEnv } from "@/lib/env";
import { listAllPublishedPosts } from "@/server/queries/posts";

export const metadata: Metadata = {
  title: "Adventure Map",
  description: "Every J²Adventures story, pinned to the place it happened.",
};

export default async function MapPage() {
  const { NEXT_PUBLIC_STADIA_MAPS_API_KEY } = getPublicEnv();
  const allPosts = await listAllPublishedPosts();
  const mappedCount = allPosts.filter((p) => p.locationLat !== null).length;

  return (
    <main id="main-content" className="min-h-screen pb-16 pt-20 sm:pt-24" style={{ background: "var(--background)" }} tabIndex={-1}>
      <SiteHeader />

      <div className="container mx-auto mt-4 max-w-5xl px-4 sm:mt-6 sm:px-6 lg:px-8">
        {/* Page header */}
        <div className="mb-6">
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-[var(--accent)]">Explore</p>
          <h1 className="mt-1 text-3xl font-bold text-[var(--text-primary)] sm:text-4xl">Adventure Map</h1>
          <p className="mt-2 text-base leading-relaxed text-[var(--text-secondary)]">
            {mappedCount > 0
              ? `${mappedCount} ${mappedCount === 1 ? "story" : "stories"} pinned to the map.`
              : "Stories will appear here as locations are added."}
          </p>
        </div>

        {/* Map + category filter + post list */}
        {NEXT_PUBLIC_STADIA_MAPS_API_KEY ? (
          <WorldMap apiKey={NEXT_PUBLIC_STADIA_MAPS_API_KEY} posts={allPosts} />
        ) : (
          <div className="flex h-64 items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] text-sm text-[var(--text-secondary)]">
            Map unavailable — add{" "}
            <code className="mx-1 rounded bg-[var(--accent-soft)] px-1.5 py-0.5 text-xs">
              NEXT_PUBLIC_STADIA_MAPS_API_KEY
            </code>{" "}
            to enable it.
          </div>
        )}
      </div>
    </main>
  );
}
