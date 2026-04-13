export const dynamic = "force-dynamic";

import type { Metadata } from "next";

import { WorldMap } from "@/components/blog/world-map";
import { SiteHeader } from "@/components/layout/site-header";
import { getPublicEnv } from "@/lib/env";
import { groupWishlistByLocation } from "@/lib/wishlist/grouping";
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
    slug: `wishlist-${place.id}`,
    title: place.name,
    locationName: place.locationName,
    locationLat: place.locationLat,
    locationLng: place.locationLng,
    locationZoom: place.locationZoom,
    iovanderUrl: place.externalUrl,
    imageUrl: null,
    category: place.visited ? "Visited" : "Wishlist",
    createdAt: new Date(0).toISOString(),
  }));

  const locationGroups = groupWishlistByLocation(places);

  return (
    <main id="main-content" className="min-h-screen pb-16 pt-20 sm:pt-24" style={{ background: "var(--background)" }} tabIndex={-1}>
      <SiteHeader />

      <div className="container mx-auto mt-4 max-w-5xl px-4 sm:mt-6 sm:px-6 lg:px-8">
        <div className="mb-6">
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-[var(--accent)]">Explore</p>
          <h1 className="mt-1 text-3xl font-bold text-[var(--text-primary)] sm:text-4xl">Travel Wishlist</h1>
          <p className="mt-2 text-base leading-relaxed text-[var(--text-secondary)]">{summary}</p>
        </div>

        {places.length > 0 && NEXT_PUBLIC_STADIA_MAPS_API_KEY ? (
          <WorldMap apiKey={NEXT_PUBLIC_STADIA_MAPS_API_KEY} posts={mapPlaces} />
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
                              <h2 className="text-lg font-semibold text-[var(--text-primary)]">{place.name}</h2>
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
                                src={place.imageUrl}
                              />
                            ) : null}
                          </div>
                          {place.externalUrl ? (
                            <a
                              className="shrink-0 text-sm font-semibold text-[var(--accent)] underline-offset-4 hover:underline"
                              href={place.externalUrl}
                              rel="noopener noreferrer"
                              target="_blank"
                            >
                              Learn more
                            </a>
                          ) : null}
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
