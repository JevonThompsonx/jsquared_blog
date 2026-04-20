export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { WorldMap } from "@/components/blog/world-map";
import { SiteHeader } from "@/components/layout/site-header";
import { getPublicEnv } from "@/lib/env";
import { getPublicWishlistPlaceBySlug, getPublicWishlistPlaceChildren } from "@/server/queries/wishlist";
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
  const place = await getPublicWishlistPlaceBySlug(slug);

  if (!place) {
    notFound();
  }

  const { NEXT_PUBLIC_STADIA_MAPS_API_KEY } = getPublicEnv();

  // Fetch children for multi-site items
  const children: PublicWishlistPlace[] = place.itemType === "multi"
    ? await getPublicWishlistPlaceChildren(place.id)
    : [];

  const featuredChildren = children.filter((c) => c.sortOrder < 10);
  const otherChildren = children.filter((c) => c.sortOrder >= 10);

  const childMapPosts = children.map(toMapPost);

  return (
    <main id="main-content" className="min-h-screen pb-16 pt-20 sm:pt-24" style={{ background: "var(--background)" }} tabIndex={-1}>
      <SiteHeader />

      <div className="container mx-auto mt-4 max-w-4xl px-4 sm:mt-6 sm:px-6 lg:px-8">
        <div className="mb-6">
          <Link aria-label="Back to wishlist" className="text-sm font-semibold text-[var(--accent)] underline-offset-4 hover:underline" href="/wishlist">
            <span aria-hidden="true">← </span>Back to wishlist
          </Link>
          <p className="mt-4 text-xs font-bold uppercase tracking-[0.22em] text-[var(--accent)]">
            {place.itemType === "multi" ? "Multi-site destination" : "Wishlist destination"}
          </p>
          <h1 className="mt-1 text-3xl font-bold text-[var(--text-primary)] sm:text-4xl">{place.name}</h1>
          <p className="mt-2 text-base leading-relaxed text-[var(--text-secondary)]">{place.locationName}</p>
        </div>

        {/* Multi-site: show children map at the top */}
        {place.itemType === "multi" && children.length > 0 && NEXT_PUBLIC_STADIA_MAPS_API_KEY ? (
          <div className="mb-6">
            <WorldMap apiKey={NEXT_PUBLIC_STADIA_MAPS_API_KEY} posts={childMapPosts} showPostList={false} />
          </div>
        ) : null}

        <article className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] shadow-xl">
          {place.imageUrl ? (
            <div className="relative aspect-[16/9] w-full overflow-hidden border-b border-[var(--border)]">
              <Image alt={place.name} className="object-cover" fill sizes="(min-width: 1024px) 896px, 100vw" src={place.imageUrl} />
            </div>
          ) : null}

          <div className="space-y-4 px-6 py-6 sm:px-8">
            <div className="flex flex-wrap items-center gap-2 text-sm text-[var(--text-secondary)]">
              <span>{place.locationName}</span>
              {place.visited ? <span>• Visited</span> : <span>• Wishlist</span>}
              {place.visitedYear ? <span>• {place.visitedYear}</span> : null}
              {place.itemType === "multi" ? (
                <span className="rounded-full bg-[var(--accent-soft)] px-2 py-0.5 text-xs font-semibold text-[var(--accent)]">
                  📍 {children.length} {children.length === 1 ? "location" : "locations"}
                </span>
              ) : null}
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

        {/* Multi-site children list */}
        {place.itemType === "multi" && children.length > 0 ? (
          <div className="mt-8 space-y-6">
            {featuredChildren.length > 0 ? (
              <section>
                <h2 className="mb-3 text-xs font-bold uppercase tracking-[0.22em] text-[var(--accent)]">Featured spots</h2>
                <ul className="divide-y divide-[var(--border)] overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] shadow-xl">
                  {featuredChildren.map((child) => (
                    <WishlistChildItem key={child.id} place={child} />
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
                    <WishlistChildItem key={child.id} place={child} />
                  ))}
                </ul>
              </section>
            ) : null}
          </div>
        ) : null}

        {place.itemType === "multi" && children.length === 0 ? (
          <p className="mt-6 text-sm text-[var(--text-secondary)]">No child locations added yet.</p>
        ) : null}
      </div>
    </main>
  );
}

function WishlistChildItem({ place }: { place: PublicWishlistPlace }) {
  return (
    <li className="px-6 py-5" data-testid="wishlist-child-item">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            {place.detailSlug ? (
              <Link
                className="text-base font-semibold text-[var(--text-primary)] underline-offset-4 hover:text-[var(--accent)] hover:underline"
                href={`/wishlist/${place.detailSlug}`}
              >
                {place.name}
              </Link>
            ) : (
              <h3 className="text-base font-semibold text-[var(--text-primary)]">{place.name}</h3>
            )}
            {place.visited ? (
              <span className="rounded-full border border-[var(--border)] px-2 py-0.5 text-xs font-semibold text-[var(--text-secondary)]">
                Visited
              </span>
            ) : null}
            {place.visitedYear ? (
              <span className="rounded-full border border-[var(--border)] px-2 py-0.5 text-xs font-semibold text-[var(--accent)]">
                {place.visitedYear}
              </span>
            ) : null}
          </div>
          <p className="mt-0.5 text-xs text-[var(--text-secondary)]">{place.locationName}</p>
          {place.description ? (
            <p className="mt-1 text-sm leading-relaxed text-[var(--text-secondary)]">{place.description}</p>
          ) : null}
        </div>
        {place.externalUrl ? (
          <a
            aria-label={`Learn more about ${place.name}`}
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
  );
}
