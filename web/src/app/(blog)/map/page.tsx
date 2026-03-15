export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import Link from "next/link";

import { SiteHeader } from "@/components/layout/site-header";
import { WorldMap } from "@/components/blog/world-map";
import { PostDate } from "@/components/blog/post-date";
import { getPublicEnv } from "@/lib/env";
import { listAllPublishedPosts } from "@/server/queries/posts";
import { getPostHref } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Adventure Map",
  description: "Every J²Adventures story, pinned to the place it happened.",
};

export default async function MapPage() {
  const { NEXT_PUBLIC_STADIA_MAPS_API_KEY } = getPublicEnv();
  const allPosts = await listAllPublishedPosts();
  const mappedPosts = allPosts.filter((p) => p.locationLat !== null && p.locationLng !== null);

  return (
    <main className="min-h-screen pb-16 pt-20 sm:pt-24" style={{ background: "var(--background)" }}>
      <SiteHeader />

      <div className="container mx-auto mt-4 max-w-5xl px-4 sm:mt-6 sm:px-6 lg:px-8">
        {/* Page header */}
        <div className="mb-6">
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-[var(--accent)]">Explore</p>
          <h1 className="mt-1 text-3xl font-bold text-[var(--text-primary)] sm:text-4xl">Adventure Map</h1>
          <p className="mt-2 text-base leading-relaxed text-[var(--text-secondary)]">
            {mappedPosts.length > 0
              ? `${mappedPosts.length} ${mappedPosts.length === 1 ? "story" : "stories"} pinned to the map. Click any marker to explore.`
              : "Stories will appear here as locations are added."}
          </p>
        </div>

        {/* Map */}
        {NEXT_PUBLIC_STADIA_MAPS_API_KEY ? (
          <WorldMap apiKey={NEXT_PUBLIC_STADIA_MAPS_API_KEY} posts={allPosts} />
        ) : (
          <div className="flex h-64 items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] text-sm text-[var(--text-secondary)]">
            Map unavailable — add <code className="mx-1 rounded bg-[var(--accent-soft)] px-1.5 py-0.5 text-xs">NEXT_PUBLIC_STADIA_MAPS_API_KEY</code> to enable it.
          </div>
        )}

        {/* Post list with locations */}
        {mappedPosts.length > 0 ? (
          <section className="mt-10">
            <h2 className="mb-4 text-lg font-bold text-[var(--text-primary)]">All pinned stories</h2>
            <div className="divide-y divide-[var(--border)] overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card-bg)]">
              {mappedPosts.map((post) => (
                <Link
                  key={post.id}
                  className="flex items-start gap-4 px-5 py-4 transition-colors hover:bg-[var(--accent-soft)]"
                  href={getPostHref(post)}
                >
                  {post.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      alt={post.title}
                      className="h-14 w-20 shrink-0 rounded-lg object-cover"
                      loading="lazy"
                      src={post.imageUrl}
                    />
                  ) : (
                    <div className="h-14 w-20 shrink-0 rounded-lg bg-gradient-to-br from-[var(--accent-soft)] to-[var(--background)]" />
                  )}
                  <div className="min-w-0">
                    {post.category ? (
                      <p className="text-[0.65rem] font-bold uppercase tracking-widest text-[var(--accent)]">
                        {post.category}
                      </p>
                    ) : null}
                    <p className="mt-0.5 font-semibold leading-snug text-[var(--text-primary)] line-clamp-1">
                      {post.title}
                    </p>
                    <div className="mt-0.5 flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                      <svg aria-hidden="true" className="h-3 w-3 shrink-0" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7Zm0 9.5a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5Z" />
                      </svg>
                      <span>{post.locationName}</span>
                      <span className="text-[var(--border)]">·</span>
                      <PostDate dateString={post.createdAt} />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </main>
  );
}
