export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { WorldMap } from "@/components/blog/world-map";
import { MultiSiteNav } from "@/components/blog/multi-site-nav";
import { SiteHeader } from "@/components/layout/site-header";
import { getPublicEnv } from "@/lib/env";
import { groupWishlistByLocation } from "@/lib/wishlist/grouping";
import { getAdminServerSession } from "@/lib/auth/session";
import {
  getPublicWishlistPlaceBySlug,
  getPublicWishlistPlaceChildren,
  getSiblingMultiSites,
} from "@/server/queries/wishlist";
import type { PublicWishlistPlace } from "@/server/queries/wishlist";

type WishlistDetailPageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: WishlistDetailPageProps): Promise<Metadata> {
  const { slug } = await params;
  const place = await getPublicWishlistPlaceBySlug(slug);

  if (!place) {
    return {};
  }

  const description = place.description ?? `${place.name} on the J squared travel wishlist.`;

  return {
    title: `${place.name} | Travel Wishlist`,
    description,
    openGraph: {
      title: place.name,
      description,
      images: place.imageUrl ? [{ url: place.imageUrl }] : undefined,
    },
  };
}

function toMapPost(place: PublicWishlistPlace) {
  return {
    id: place.id,
    title: place.name,
    href: place.detailSlug ? `/wishlist/${place.detailSlug}` : null,
    locationName: place.locationName,
    locationLat: place.locationLat,
    locationLng: place.locationLng,
    locationZoom: place.locationZoom,
    iovanderUrl: place.externalUrl,
    imageUrl: place.imageUrl,
    category: place.visited ? "Visited" : "Wishlist",
    createdAt: null,
    linkLabel: place.detailSlug ? "View destination" : null,
  };
}

export default async function WishlistDetailPage({ params }: WishlistDetailPageProps) {
  const { slug } = await params;
  const [place, adminSession] = await Promise.all([
    getPublicWishlistPlaceBySlug(slug),
    getAdminServerSession(),
  ]);

  if (!place) {
    notFound();
  }

  const isAdmin = adminSession !== null;
  const { NEXT_PUBLIC_STADIA_MAPS_API_KEY } = getPublicEnv();

  // Multi-site: fetch siblings, children, grandchildren
  let siblings: PublicWishlistPlace[] = [];
  let children: PublicWishlistPlace[] = [];
  let grandchildren = new Map<string, PublicWishlistPlace[]>();
  let prevSibling: PublicWishlistPlace | null = null;
  let nextSibling: PublicWishlistPlace | null = null;

  if (place.itemType === "multi") {
    [siblings, children] = await Promise.all([
      getSiblingMultiSites(place.id),
      getPublicWishlistPlaceChildren(place.id),
    ]);

    // Build prev/next from siblings list (includes current)
    const allSiblings = [place, ...siblings].sort(
      (a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name),
    );
    const currentIndex = allSiblings.findIndex((s) => s.id === place.id);
    prevSibling = currentIndex > 0 ? allSiblings[currentIndex - 1]! : null;
    nextSibling = currentIndex < allSiblings.length - 1 ? allSiblings[currentIndex + 1]! : null;

    // Fetch grandchildren for nested multi-sites
    const childMultiSites = children.filter((c) => c.itemType === "multi");
    for (const child of childMultiSites) {
      const grandChildren = await getPublicWishlistPlaceChildren(child.id);
      grandchildren.set(child.id, grandChildren);
    }
  }

  const featuredChildren = children.filter((c) => c.isPinned);
  const otherChildren = children.filter((c) => !c.isPinned);

  const childMapPosts = children.map(toMapPost);

  return (
    <main id="main-content" className="min-h-screen pb-16 pt-20 sm:pt-24" style={{ background: "var(--background)" }} tabIndex={-1}>
      <SiteHeader />

      <div className="container mx-auto mt-4 max-w-5xl px-4 sm:mt-6 sm:px-6 lg:px-8">
        <div className="mb-6">
          <Link aria-label="Back to wishlist" className="text-sm font-semibold text-[var(--accent)] underline-offset-4 hover:underline" href="/wishlist">
            <span aria-hidden="true">← </span>Back to wishlist
          </Link>
          {isAdmin ? (
            <a
              className="ml-4 text-xs font-semibold text-[var(--text-secondary)] underline-offset-4 hover:underline"
              data-testid="admin-edit-detail-place-link"
              href={`/admin/wishlist#place-${place.id}`}
            >
              Edit
            </a>
          ) : null}
          <p className="mt-4 text-xs font-bold uppercase tracking-[0.22em] text-[var(--accent)]">
            {place.itemType === "multi" ? "Multi-site destination" : "Wishlist destination"}
          </p>
          <h1 className="mt-1 text-3xl font-bold text-[var(--text-primary)] sm:text-4xl">{place.name}</h1>
          <p className="mt-2 text-base leading-relaxed text-[var(--text-secondary)]">{place.locationName}</p>
        </div>

        {/* Multi-site view */}
        {place.itemType === "multi" ? (
          <div className="flex flex-col gap-8 md:flex-row">
            {/* Sidebar */}
            {siblings.length > 0 ? (
              <div className="w-full shrink-0 md:w-48">
                <MultiSiteNav
                  currentId={place.id}
                  currentName={place.name}
                  siblings={siblings.map((s) => ({
                    id: s.id,
                    name: s.name,
                    detailSlug: s.detailSlug,
                  }))}
                />
              </div>
            ) : null}

            {/* Main content */}
            <div className="min-w-0 flex-1">
              {/* Map */}
              {children.length > 0 && NEXT_PUBLIC_STADIA_MAPS_API_KEY ? (
                <div className="mb-6">
                  <WorldMap apiKey={NEXT_PUBLIC_STADIA_MAPS_API_KEY} posts={childMapPosts} showPostList={false} />
                </div>
              ) : null}

              {/* Parent article */}
              <article className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] shadow-xl">
                {place.imageUrl ? (
                  <div className="relative aspect-[16/9] w-full overflow-hidden border-b border-[var(--border)]">
                    <Image alt={place.name} className="object-cover" fill sizes="(min-width: 1024px) 672px, 100vw" src={place.imageUrl} />
                  </div>
                ) : null}

                <div className="space-y-4 px-6 py-6 sm:px-8">
                  <div className="flex flex-wrap items-center gap-2 text-sm text-[var(--text-secondary)]">
                    <span>{place.locationName}</span>
                    {place.visited ? <span>• Visited</span> : <span>• Wishlist</span>}
                    {place.visitedYear ? <span>• {place.visitedYear}</span> : null}
                    <span className="rounded-full bg-[var(--accent-soft)] px-2 py-0.5 text-xs font-semibold text-[var(--accent)]">
                      📍 {children.length} {children.length === 1 ? "location" : "locations"}
                    </span>
                  </div>

                  {place.description ? (
                    <p className="text-base leading-relaxed text-[var(--text-primary)]">{place.description}</p>
                  ) : (
                    <p className="text-base leading-relaxed text-[var(--text-secondary)]">More notes for this destination are coming soon.</p>
                  )}

                  <div className="flex flex-wrap gap-3">
                    {place.externalUrl ? (
                      <a
                        aria-label={`Learn more about ${place.name}`}
                        className="btn-primary rounded-full px-4 py-2 text-sm font-semibold"
                        href={place.externalUrl}
                        rel="noopener noreferrer"
                        target="_blank"
                      >
                        Learn more
                      </a>
                    ) : null}
                  </div>
                </div>
              </article>

              {/* Children list — same structure as main wishlist page */}
              {children.length > 0 ? (
                <div className="mt-8 space-y-6">
                  {featuredChildren.length > 0 ? (
                    <section>
                      <h2 className="mb-3 text-xs font-bold uppercase tracking-[0.22em] text-[var(--accent)]">📌 Featured spots</h2>
                      <ul className="divide-y divide-[var(--border)] overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] shadow-xl">
                        {featuredChildren.map((child) => (
                          <WishlistChildItem
                            key={child.id}
                            child={child}
                            grandchildren={grandchildren.get(child.id) ?? []}
                          />
                        ))}
                      </ul>
                    </section>
                  ) : null}

                  {otherChildren.length > 0 ? (
                    <section>
                      <h2 className="mb-3 text-xs font-bold uppercase tracking-[0.22em] text-[var(--accent)]">
                        {featuredChildren.length > 0 ? "All spots" : "Spots"}
                      </h2>
                      <ul className="divide-y divide-[var(--border)] overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] shadow-xl">
                        {otherChildren.map((child) => (
                          <WishlistChildItem
                            key={child.id}
                            child={child}
                            grandchildren={grandchildren.get(child.id) ?? []}
                          />
                        ))}
                      </ul>
                    </section>
                  ) : null}
                </div>
              ) : null}

              {children.length === 0 ? (
                <p className="mt-6 text-sm text-[var(--text-secondary)]">No child locations added yet.</p>
              ) : null}

              {/* Prev/Next navigation */}
              {(prevSibling || nextSibling) && (
                <nav aria-label="Destination navigation" className="mt-10 flex items-center justify-between gap-4 border-t border-[var(--border)] pt-6" data-testid="multi-site-nav-prev-next">
                  {prevSibling?.detailSlug ? (
                    <Link className="text-sm font-semibold text-[var(--accent)] underline-offset-4 hover:underline" href={`/wishlist/${prevSibling.detailSlug}`}>
                      ← {prevSibling.name}
                    </Link>
                  ) : (
                    <span />
                  )}
                  {nextSibling?.detailSlug ? (
                    <Link className="text-sm font-semibold text-[var(--accent)] underline-offset-4 hover:underline" href={`/wishlist/${nextSibling.detailSlug}`}>
                      {nextSibling.name} →
                    </Link>
                  ) : (
                    <span />
                  )}
                </nav>
              )}
            </div>
          </div>
        ) : (
          /* Single site view */
          <article className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] shadow-xl">
            {place.detailLevel === "full_page" && place.imageUrl ? (
              <div className="relative aspect-[16/9] w-full overflow-hidden border-b border-[var(--border)]">
                <Image alt={place.name} className="object-cover" fill sizes="(min-width: 1024px) 896px, 100vw" src={place.imageUrl} />
              </div>
            ) : null}

            <div className="space-y-4 px-6 py-6 sm:px-8">
              <div className="flex flex-wrap items-center gap-2 text-sm text-[var(--text-secondary)]">
                <span>{place.locationName}</span>
                {place.visited ? <span>• Visited</span> : <span>• Wishlist</span>}
                {place.visitedYear ? <span>• {place.visitedYear}</span> : null}
              </div>

              {place.detailLevel === "full_page" ? (
                <>
                  {place.description ? (
                    <p className="text-base leading-relaxed text-[var(--text-primary)]">{place.description}</p>
                  ) : (
                    <p className="text-base leading-relaxed text-[var(--text-secondary)]">More notes for this destination are coming soon.</p>
                  )}

                  <div className="flex flex-wrap gap-3">
                    {place.externalUrl ? (
                      <a
                        aria-label={`Learn more about ${place.name}`}
                        className="btn-primary rounded-full px-4 py-2 text-sm font-semibold"
                        href={place.externalUrl}
                        rel="noopener noreferrer"
                        target="_blank"
                      >
                        Learn more
                      </a>
                    ) : null}
                  </div>
                </>
              ) : (
                <p className="text-sm text-[var(--text-secondary)]">
                  {place.externalUrl ? (
                    <a className="text-[var(--accent)] underline-offset-4 hover:underline" href={place.externalUrl} rel="noopener noreferrer" target="_blank">
                      View details →
                    </a>
                  ) : null}
                </p>
              )}
            </div>
          </article>
        )}
      </div>
    </main>
  );
}

function WishlistChildItem({
  child,
  grandchildren,
}: {
  child: PublicWishlistPlace;
  grandchildren: PublicWishlistPlace[];
}) {
  const hasGrandchildren = child.itemType === "multi" && grandchildren.length > 0;

  return (
    <li className="px-6 py-5" data-testid="wishlist-child-item">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            {child.detailSlug ? (
              <Link
                className="text-base font-semibold text-[var(--text-primary)] underline-offset-4 hover:text-[var(--accent)] hover:underline"
                href={`/wishlist/${child.detailSlug}`}
              >
                {child.name}
              </Link>
            ) : (
              <h3 className="text-base font-semibold text-[var(--text-primary)]">{child.name}</h3>
            )}
            {child.itemType === "multi" ? (
              <span className="rounded-full bg-[var(--accent-soft)] px-2 py-0.5 text-xs font-semibold text-[var(--accent)]" data-testid="child-multi-site-badge">
                📍 Multi-site
              </span>
            ) : null}
            {child.visited ? (
              <span className="rounded-full border border-[var(--border)] px-2 py-0.5 text-xs font-semibold text-[var(--text-secondary)]">
                Visited
              </span>
            ) : null}
            {child.visitedYear ? (
              <span className="rounded-full border border-[var(--border)] px-2 py-0.5 text-xs font-semibold text-[var(--accent)]">
                {child.visitedYear}
              </span>
            ) : null}
          </div>
          <p className="mt-0.5 text-xs text-[var(--text-secondary)]">{child.locationName}</p>
          {child.description ? (
            <p className="mt-1 text-sm leading-relaxed text-[var(--text-secondary)]">{child.description}</p>
          ) : null}
        </div>
        {child.externalUrl ? (
          <a
            aria-label={`Learn more about ${child.name}`}
            className="shrink-0 text-sm font-semibold text-[var(--accent)] underline-offset-4 hover:underline"
            href={child.externalUrl}
            rel="noopener noreferrer"
            target="_blank"
          >
            Learn more
          </a>
        ) : null}
      </div>

      {/* Nested grandchildren (for multi within multi) */}
      {hasGrandchildren ? (
        <div className="mt-3 border-t border-[var(--border)] pt-3">
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-[var(--accent)]">Nested locations</p>
          <ul className="space-y-2">
            {grandchildren.map((gc) => (
              <li key={gc.id} className="flex items-start gap-2 text-sm">
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--accent)]" />
                <div>
                  {gc.detailSlug ? (
                    <Link className="font-medium text-[var(--text-primary)] underline-offset-4 hover:text-[var(--accent)] hover:underline" href={`/wishlist/${gc.detailSlug}`}>
                      {gc.name}
                    </Link>
                  ) : (
                    <span className="font-medium text-[var(--text-primary)]">{gc.name}</span>
                  )}
                  <span className="ml-1.5 text-xs text-[var(--text-secondary)]">{gc.locationName}</span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </li>
  );
}
