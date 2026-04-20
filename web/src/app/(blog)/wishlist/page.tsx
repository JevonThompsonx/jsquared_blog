export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import Link from "next/link";

import { WorldMap } from "@/components/blog/world-map";
import { SiteHeader } from "@/components/layout/site-header";
import { getPublicEnv } from "@/lib/env";
import { groupWishlistByLocation } from "@/lib/wishlist/grouping";
import { getAdminServerSession } from "@/lib/auth/session";
import type { PublicWishlistPlace } from "@/server/queries/wishlist";
import { listPublicWishlistPlaces } from "@/server/queries/wishlist";

export const metadata: Metadata = {
  title: "Travel Wishlist",
  description: "Future destinations J squared wants to explore next.",
};

export default async function WishlistPage() {
  const { NEXT_PUBLIC_STADIA_MAPS_API_KEY } = getPublicEnv();
  let places: PublicWishlistPlace[] = [];
  let wishlistLoadFailed = false;

  const [adminSession] = await Promise.all([
    getAdminServerSession(),
  ]);
  const isAdmin = adminSession !== null;

  try {
    places = await listPublicWishlistPlaces();
  } catch (error) {
    console.error("[wishlist] Failed to load public wishlist places", error);
    wishlistLoadFailed = true;
  }

  const summary = wishlistLoadFailed
    ? "The public wishlist is temporarily offline."
    : places.length > 0
      ? `${places.length} ${places.length === 1 ? "destination is" : "destinations are"} on the public wishlist.`
      : "No destinations are on the public wishlist yet.";

  const mapPlaces = places.map((place) => ({
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
  }));

  const pinnedPlaces = places.filter((p) => p.isPinned);
  const locationGroups = groupWishlistByLocation(places);

  return (
    <main id="main-content" className="min-h-screen pb-16 pt-20 sm:pt-24" style={{ background: "var(--background)" }} tabIndex={-1}>
      <SiteHeader />

      <div className="container mx-auto mt-4 max-w-5xl px-4 sm:mt-6 sm:px-6 lg:px-8">
        <div className="mb-6">
          <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.22em] text-[var(--accent)]">
            <svg aria-hidden="true" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M12 2a9 9 0 1 0 0 18A9 9 0 0 0 12 2Z" strokeLinecap="round" strokeLinejoin="round" />
              <path d="m16.24 7.76-2.12 6.36-6.36 2.12 2.12-6.36 6.36-2.12Z" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Explore
          </p>
          <h1 className="mt-1 text-3xl font-bold text-[var(--text-primary)] sm:text-4xl">Travel Wishlist</h1>
          <p className="mt-2 text-base leading-relaxed text-[var(--text-secondary)]">{summary}</p>
        </div>

        {places.length > 0 && NEXT_PUBLIC_STADIA_MAPS_API_KEY ? (
          <div aria-label="Explore wishlist destinations on the map" role="region">
            <WorldMap apiKey={NEXT_PUBLIC_STADIA_MAPS_API_KEY} posts={mapPlaces} showPostList={false} />
          </div>
        ) : null}

        {/* Pinned section — shown below map, above full list */}
        {pinnedPlaces.length > 0 ? (
          <div className="mt-6" data-testid="pinned-wishlist-section">
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-[var(--accent)]">📌 Pinned</p>
            <ul className="divide-y divide-[var(--border)] overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] shadow-xl">
              {pinnedPlaces.map((place) => (
                <li key={place.id} className="px-6 py-5" data-place-id={place.id} data-testid="pinned-wishlist-item">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <svg aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-[var(--accent)]" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7Zm0 9.5a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5Z" />
                        </svg>
                        {place.detailSlug ? (
                          <Link className="text-lg font-semibold text-[var(--text-primary)] underline-offset-4 hover:text-[var(--accent)] hover:underline" href={`/wishlist/${place.detailSlug}`}>
                            {place.name}
                          </Link>
                        ) : (
                          <h2 className="text-lg font-semibold text-[var(--text-primary)]">{place.name}</h2>
                        )}
                        {place.visited ? (
                          <span className="rounded-full border border-[var(--border)] px-2 py-0.5 text-xs font-semibold text-[var(--text-secondary)]">Visited</span>
                        ) : null}
                        {place.visitedYear ? (
                          <span className="rounded-full border border-[var(--border)] px-2 py-0.5 text-xs font-semibold text-[var(--accent)]">{place.visitedYear}</span>
                        ) : null}
                      </div>
                      {place.description ? (
                        <p className="mt-1 text-sm leading-relaxed text-[var(--text-secondary)]">{place.description}</p>
                      ) : null}
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      {place.externalUrl ? (
                        <a
                          aria-label={`Learn more about ${place.name}`}
                          className="text-sm font-semibold text-[var(--accent)] underline-offset-4 hover:underline"
                          href={place.externalUrl}
                          rel="noopener noreferrer"
                          target="_blank"
                        >
                          Learn more
                        </a>
                      ) : null}
                      {isAdmin ? (
                        <a
                          className="text-xs font-semibold text-[var(--text-secondary)] underline-offset-4 hover:underline"
                          href={`/admin/wishlist#place-${place.id}`}
                        >
                          Edit
                        </a>
                      ) : null}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className="mt-6 overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] shadow-xl">
          {wishlistLoadFailed ? (
            <p className="px-6 py-10 text-center text-sm text-[var(--text-secondary)]">
              Wishlist temporarily unavailable. Please try again later.
            </p>
          ) : places.length === 0 ? (
            <p className="px-6 py-10 text-center text-sm text-[var(--text-secondary)]">
              No destinations are on the public wishlist yet.
            </p>
          ) : (
            <ul className="divide-y divide-[var(--border)]" data-testid="public-wishlist-list">
              {locationGroups.map((group) => (
                <li key={group.locationName} data-testid="wishlist-location-group">
                  <div className="border-b border-[var(--border)] px-6 py-3 bg-[var(--card-bg)]">
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--text-secondary)]">
                      {group.locationName}
                    </p>
                  </div>
                  <ul className="divide-y divide-[var(--border)]">
                    {group.places.map((place) => (
                      <li key={place.id} className="px-6 py-5" data-place-id={place.id} data-testid="public-wishlist-item">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <svg aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-[var(--accent)]" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7Zm0 9.5a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5Z" />
                              </svg>
                              {place.detailSlug ? (
                                <Link className="text-lg font-semibold text-[var(--text-primary)] underline-offset-4 hover:text-[var(--accent)] hover:underline" href={`/wishlist/${place.detailSlug}`}>
                                  {place.name}
                                </Link>
                              ) : (
                                <h2 className="text-lg font-semibold text-[var(--text-primary)]">{place.name}</h2>
                              )}
                              {place.itemType === "multi" ? (
                                <span className="rounded-full bg-[var(--accent-soft)] px-2 py-0.5 text-xs font-semibold text-[var(--accent)]" data-testid="multi-site-badge">
                                  📍 Multi-site
                                </span>
                              ) : null}
                              {place.visited ? (
                                <span className="rounded-full border border-[var(--border)] px-2 py-0.5 text-xs font-semibold text-[var(--text-secondary)]">
                                  Visited
                                </span>
                              ) : null}
                              {place.visitedYear ? (
                                <span
                                  className="rounded-full border border-[var(--border)] px-2 py-0.5 text-xs font-semibold text-[var(--accent)]"
                                  data-testid="visited-year-badge"
                                >
                                  {place.visitedYear}
                                </span>
                              ) : null}
                            </div>
                            {place.description ? (
                              <p className="mt-1 text-sm leading-relaxed text-[var(--text-secondary)]">{place.description}</p>
                            ) : null}
                            {place.imageUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                alt={place.name}
                                className="mt-3 max-h-48 w-full rounded-lg object-cover"
                                data-testid="place-image"
                                loading="lazy"
                                src={place.imageUrl}
                              />
                            ) : null}
                          </div>
                          <div className="flex shrink-0 items-center gap-3">
                            {place.externalUrl ? (
                              <a
                                aria-label={`Learn more about ${place.name}`}
                                className="text-sm font-semibold text-[var(--accent)] underline-offset-4 hover:underline"
                                href={place.externalUrl}
                                rel="noopener noreferrer"
                                target="_blank"
                              >
                                Learn more
                              </a>
                            ) : null}
                            {isAdmin ? (
                              <a
                                className="text-xs font-semibold text-[var(--text-secondary)] underline-offset-4 hover:underline"
                                data-testid="admin-edit-place-link"
                                href={`/admin/wishlist#place-${place.id}`}
                              >
                                Edit
                              </a>
                            ) : null}
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </main>
  );
}
