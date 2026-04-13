export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { SiteHeader } from "@/components/layout/site-header";
import { getPublicWishlistPlaceBySlug } from "@/server/queries/wishlist";

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

export default async function WishlistDetailPage({ params }: WishlistDetailPageProps) {
  const { slug } = await params;
  const place = await getPublicWishlistPlaceBySlug(slug);

  if (!place) {
    notFound();
  }

  return (
    <main id="main-content" className="min-h-screen pb-16 pt-20 sm:pt-24" style={{ background: "var(--background)" }} tabIndex={-1}>
      <SiteHeader />

      <div className="container mx-auto mt-4 max-w-4xl px-4 sm:mt-6 sm:px-6 lg:px-8">
        <div className="mb-6">
          <Link className="text-sm font-semibold text-[var(--accent)] underline-offset-4 hover:underline" href="/wishlist">
            ← Back to wishlist
          </Link>
          <p className="mt-4 text-xs font-bold uppercase tracking-[0.22em] text-[var(--accent)]">Wishlist destination</p>
          <h1 className="mt-1 text-3xl font-bold text-[var(--text-primary)] sm:text-4xl">{place.name}</h1>
          <p className="mt-2 text-base leading-relaxed text-[var(--text-secondary)]">{place.locationName}</p>
        </div>

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
            </div>

            {place.description ? (
              <p className="text-base leading-relaxed text-[var(--text-primary)]">{place.description}</p>
            ) : (
              <p className="text-base leading-relaxed text-[var(--text-secondary)]">More notes for this destination are coming soon.</p>
            )}

            <div className="flex flex-wrap gap-3">
              {place.externalUrl ? (
                <a
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
      </div>
    </main>
  );
}
