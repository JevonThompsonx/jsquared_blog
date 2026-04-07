import Link from "next/link";
import { redirect } from "next/navigation";

import { SiteHeader } from "@/components/layout/site-header";
import { requireAdminSession } from "@/lib/auth/session";
import { listAdminWishlistPlaces } from "@/server/dal/admin-wishlist-places";

import { createWishlistPlaceAction } from "./actions";

export default async function AdminWishlistPage() {
  const session = await requireAdminSession();
  if (session?.user?.role !== "admin") {
    redirect("/admin");
  }

  const places = await listAdminWishlistPlaces();

  return (
    <main id="main-content" className="min-h-screen px-4 pb-12 pt-24 sm:px-6 lg:px-8" style={{ background: "var(--background)" }}>
      <SiteHeader />

      <section className="container mx-auto max-w-[min(92rem,calc(100vw-2rem))]">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-[var(--accent)]">Admin</p>
            <h1 className="mt-1 text-3xl font-bold text-[var(--text-primary)]">Travel wishlist</h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--text-secondary)]">
              Track future destinations with validated coordinates so the public wishlist map and route planner can build on stable data.
            </p>
          </div>
          <Link
            className="rounded-full border border-[var(--border)] px-4 py-2 text-sm font-semibold text-[var(--text-secondary)] transition-colors hover:border-[var(--primary)] hover:text-[var(--primary)]"
            href="/admin"
          >
            ← Dashboard
          </Link>
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,28rem)_minmax(0,1fr)]">
          <form action={createWishlistPlaceAction} className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-6 shadow-xl">
            <h2 className="text-xl font-semibold text-[var(--text-primary)]">Add destination</h2>
            <div className="mt-5 space-y-4">
              <label className="block text-sm text-[var(--text-secondary)]">
                <span className="mb-1 block font-medium text-[var(--text-primary)]">Name</span>
                <input className="w-full rounded-lg border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-2 text-[var(--input-text)]" name="name" required type="text" />
              </label>
              <label className="block text-sm text-[var(--text-secondary)]">
                <span className="mb-1 block font-medium text-[var(--text-primary)]">Location label</span>
                <input className="w-full rounded-lg border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-2 text-[var(--input-text)]" name="locationName" required type="text" />
              </label>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-sm text-[var(--text-secondary)]">
                  <span className="mb-1 block font-medium text-[var(--text-primary)]">Latitude</span>
                  <input className="w-full rounded-lg border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-2 text-[var(--input-text)]" name="latitude" required step="any" type="number" />
                </label>
                <label className="block text-sm text-[var(--text-secondary)]">
                  <span className="mb-1 block font-medium text-[var(--text-primary)]">Longitude</span>
                  <input className="w-full rounded-lg border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-2 text-[var(--input-text)]" name="longitude" required step="any" type="number" />
                </label>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-sm text-[var(--text-secondary)]">
                  <span className="mb-1 block font-medium text-[var(--text-primary)]">Zoom</span>
                  <input className="w-full rounded-lg border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-2 text-[var(--input-text)]" defaultValue="8" name="zoom" step="1" type="number" />
                </label>
                <label className="block text-sm text-[var(--text-secondary)]">
                  <span className="mb-1 block font-medium text-[var(--text-primary)]">Sort order</span>
                  <input className="w-full rounded-lg border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-2 text-[var(--input-text)]" defaultValue="0" name="sortOrder" step="1" type="number" />
                </label>
              </div>
              <label className="block text-sm text-[var(--text-secondary)]">
                <span className="mb-1 block font-medium text-[var(--text-primary)]">Optional link</span>
                <input className="w-full rounded-lg border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-2 text-[var(--input-text)]" name="externalUrl" placeholder="https://example.com/place-guide" type="url" />
              </label>
              <div className="flex flex-wrap gap-4 text-sm text-[var(--text-secondary)]">
                <label className="inline-flex items-center gap-2">
                  <input name="visited" type="checkbox" />
                  Visited already
                </label>
                <label className="inline-flex items-center gap-2">
                  <input name="isPublic" type="checkbox" />
                  Show publicly
                </label>
              </div>
              <button className="btn-primary rounded-lg px-4 py-2 text-sm font-semibold" type="submit">
                Save destination
              </button>
            </div>
          </form>

          <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] shadow-xl">
            {places.length === 0 ? (
              <p className="px-6 py-10 text-center text-sm text-[var(--text-secondary)]">
                No wishlist destinations yet.
              </p>
            ) : (
              <ul className="divide-y divide-[var(--border)]">
                {places.map((place) => (
                  <li key={place.id} className="px-6 py-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="text-lg font-semibold text-[var(--text-primary)]">{place.name}</h2>
                          {place.isPublic ? (
                            <span className="rounded-full bg-[var(--accent-soft)] px-2 py-0.5 text-xs font-semibold text-[var(--accent)]">Public</span>
                          ) : null}
                          {place.visited ? (
                            <span className="rounded-full border border-[var(--border)] px-2 py-0.5 text-xs font-semibold text-[var(--text-secondary)]">Visited</span>
                          ) : null}
                        </div>
                        <p className="mt-2 text-sm text-[var(--text-secondary)]">{place.locationName}</p>
                        <p className="mt-1 text-xs text-[var(--text-secondary)]">
                          {place.locationLat.toFixed(4)}, {place.locationLng.toFixed(4)} · zoom {place.locationZoom} · sort {place.sortOrder}
                        </p>
                      </div>
                      {place.externalUrl ? (
                        <a className="text-sm font-semibold text-[var(--accent)] underline-offset-4 hover:underline" href={place.externalUrl} rel="noreferrer" target="_blank">
                          Open link
                        </a>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
