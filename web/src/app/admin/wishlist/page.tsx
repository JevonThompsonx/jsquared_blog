import Link from "next/link";
import { redirect } from "next/navigation";

import { SiteHeader } from "@/components/layout/site-header";
import { WishlistLocationAutocomplete } from "@/components/admin/wishlist-location-autocomplete";
import { requireAdminSession } from "@/lib/auth/session";
import { listAdminWishlistPlaces, type AdminWishlistPlaceRecord } from "@/server/dal/admin-wishlist-places";

import { createWishlistPlaceAction, deleteWishlistPlaceAction, updateWishlistPlaceAction, checkOffWishlistPlaceAction } from "./actions";

export default async function AdminWishlistPage() {
  const session = await requireAdminSession();
  if (session?.user?.role !== "admin") {
    redirect("/admin");
  }

  let places: AdminWishlistPlaceRecord[] = [];
  let wishlistLoadFailed = false;

  try {
    places = await listAdminWishlistPlaces();
  } catch (error) {
    console.error("[admin wishlist] Failed to load wishlist places", error);
    wishlistLoadFailed = true;
  }

  // Multi-site parent options (for parentId dropdown)
  const multiPlaces = places.filter((p) => p.itemType === "multi");

  return (
    <main id="main-content" className="min-h-screen px-4 pb-12 pt-24 sm:px-6 lg:px-8" style={{ background: "var(--background)" }}>
      <SiteHeader />

      <section className="container mx-auto max-w-[min(92rem,calc(100vw-2rem))]">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-[var(--accent)]">Admin</p>
            <h1 className="mt-1 text-3xl font-bold text-[var(--text-primary)]">Travel wishlist</h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--text-secondary)]">
              Track future destinations with validated coordinates, optional photos, and optional detail pages for the public wishlist.
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
          {wishlistLoadFailed ? (
            <section className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-6 shadow-xl">
              <h2 className="text-xl font-semibold text-[var(--text-primary)]">Wishlist unavailable</h2>
              <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">
                The current wishlist data could not be loaded, so editing is temporarily disabled to avoid making changes without the latest state.
              </p>
            </section>
          ) : (
            <form action={createWishlistPlaceAction} className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-6 shadow-xl" data-testid="admin-wishlist-create-form">
              <h2 className="text-xl font-semibold text-[var(--text-primary)]">Add destination</h2>
              <div className="mt-5 space-y-4">
                <label className="block text-sm text-[var(--text-secondary)]">
                  <span className="mb-1 block font-medium text-[var(--text-primary)]">Name</span>
                  <input className="w-full rounded-lg border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-2 text-[var(--input-text)]" name="name" required type="text" />
                </label>
                <WishlistLocationAutocomplete />

                {/* Item type */}
                <fieldset>
                  <legend className="mb-2 text-sm font-medium text-[var(--text-primary)]">Item type</legend>
                  <div className="flex flex-wrap gap-4 text-sm text-[var(--text-secondary)]">
                    <label className="inline-flex items-center gap-2">
                      <input defaultChecked name="itemType" type="radio" value="single" />
                      Single location
                    </label>
                    <label className="inline-flex items-center gap-2">
                      <input name="itemType" type="radio" value="multi" />
                      Multi-site area
                    </label>
                  </div>
                  <p className="mt-1 text-xs text-[var(--text-secondary)]">
                    Multi-site: a geographic area containing child locations. Requires a detail slug.
                  </p>
                </fieldset>

                <label className="block text-sm text-[var(--text-secondary)]">
                  <span className="mb-1 block font-medium text-[var(--text-primary)]">Short description <span className="font-normal text-[var(--text-secondary)]">(optional, max 500 chars)</span></span>
                  <textarea className="w-full rounded-lg border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-2 text-[var(--input-text)]" maxLength={500} name="description" rows={2} />
                </label>
                <label className="block text-sm text-[var(--text-secondary)]">
                  <span className="mb-1 block font-medium text-[var(--text-primary)]">Sort order</span>
                  <input className="w-full rounded-lg border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-2 text-[var(--input-text)]" defaultValue="0" name="sortOrder" step="1" type="number" />
                </label>
                <label className="block text-sm text-[var(--text-secondary)]">
                  <span className="mb-1 block font-medium text-[var(--text-primary)]">Optional link</span>
                  <input className="w-full rounded-lg border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-2 text-[var(--input-text)]" name="externalUrl" placeholder="https://example.com/place-guide" type="url" />
                </label>
                <label className="block text-sm text-[var(--text-secondary)]">
                  <span className="mb-1 block font-medium text-[var(--text-primary)]">Visited year <span className="font-normal text-[var(--text-secondary)]">(optional)</span></span>
                  <input className="w-full rounded-lg border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-2 text-[var(--input-text)]" name="visitedYear" placeholder="2026" step="1" type="number" />
                </label>
                <label className="block text-sm text-[var(--text-secondary)]">
                  <span className="mb-1 block font-medium text-[var(--text-primary)]">Image URL <span className="font-normal text-[var(--text-secondary)]">(optional HTTPS image)</span></span>
                  <input className="w-full rounded-lg border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-2 text-[var(--input-text)]" name="imageUrl" placeholder="https://images.example.com/place.jpg" type="url" />
                </label>
                <label className="block text-sm text-[var(--text-secondary)]">
                  <span className="mb-1 block font-medium text-[var(--text-primary)]">Detail page slug <span className="font-normal text-[var(--text-secondary)]">(optional; required for multi-site)</span></span>
                  <input className="w-full rounded-lg border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-2 text-[var(--input-text)]" name="detailSlug" placeholder="banff-gondola" type="text" />
                </label>

                {/* Parent selection for new single items */}
                {multiPlaces.length > 0 ? (
                  <label className="block text-sm text-[var(--text-secondary)]">
                    <span className="mb-1 block font-medium text-[var(--text-primary)]">Parent area <span className="font-normal text-[var(--text-secondary)]">(optional — assign to a multi-site parent)</span></span>
                    <select className="w-full rounded-lg border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-2 text-[var(--input-text)]" name="parentId">
                      <option value="">— None —</option>
                      {multiPlaces.map((mp) => (
                        <option key={mp.id} value={mp.id}>{mp.name}</option>
                      ))}
                    </select>
                  </label>
                ) : null}

                <div className="flex flex-wrap gap-4 text-sm text-[var(--text-secondary)]">
                  <label className="inline-flex items-center gap-2">
                    <input name="visited" type="checkbox" />
                    Visited already
                  </label>
                  <label className="inline-flex items-center gap-2">
                    <input defaultChecked name="isPublic" type="checkbox" />
                    Show publicly
                  </label>
                  <label className="inline-flex items-center gap-2">
                    <input name="isPinned" type="checkbox" />
                    Pin to top of list
                  </label>
                </div>
                <button className="btn-primary rounded-lg px-4 py-2 text-sm font-semibold" type="submit">
                  Save destination
                </button>
              </div>
            </form>
          )}

          <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] shadow-xl">
            {wishlistLoadFailed ? (
              <p className="px-6 py-10 text-center text-sm text-[var(--text-secondary)]">
                Wishlist data is temporarily unavailable. Please try again later.
              </p>
            ) : places.length === 0 ? (
              <p className="px-6 py-10 text-center text-sm text-[var(--text-secondary)]">
                No wishlist destinations yet.
              </p>
            ) : (
              <ul className="divide-y divide-[var(--border)]" data-testid="admin-wishlist-list">
                {places.map((place) => (
                  <li id={`place-${place.id}`} key={place.id} className="px-6 py-5" data-place-id={place.id} data-testid="admin-wishlist-row">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h2 className="text-lg font-semibold text-[var(--text-primary)]">{place.name}</h2>
                            {place.itemType === "multi" ? (
                              <span className="rounded-full bg-[var(--accent-soft)] px-2 py-0.5 text-xs font-semibold text-[var(--accent)]" data-testid="admin-wishlist-multi-badge">Multi-site</span>
                            ) : null}
                            {place.isPublic ? (
                              <span className="rounded-full bg-[var(--accent-soft)] px-2 py-0.5 text-xs font-semibold text-[var(--accent)]" data-testid="admin-wishlist-public-badge">Public</span>
                            ) : null}
                            {place.isPinned ? (
                              <span className="rounded-full bg-[var(--accent-soft)] px-2 py-0.5 text-xs font-semibold text-[var(--accent)]" data-testid="admin-wishlist-pinned-badge">📌 Pinned</span>
                            ) : null}
                            {place.visited ? (
                              <span className="rounded-full border border-[var(--border)] px-2 py-0.5 text-xs font-semibold text-[var(--text-secondary)]" data-testid="admin-wishlist-visited-badge">Visited</span>
                            ) : null}
                          </div>
                          <p className="mt-2 text-sm text-[var(--text-secondary)]">{place.locationName}</p>
                          {place.parentId ? (
                            <p className="mt-1 text-xs text-[var(--text-secondary)]">
                              Child of: {places.find((p) => p.id === place.parentId)?.name ?? place.parentId}
                            </p>
                          ) : null}
                          {place.description ? (
                            <p className="mt-1 text-sm text-[var(--text-secondary)]">{place.description}</p>
                          ) : null}
                          {place.visitedYear ? (
                            <p className="mt-1 text-xs text-[var(--accent)]">Visited year: {place.visitedYear}</p>
                          ) : null}
                          {place.detailSlug ? (
                            <p className="mt-1 text-xs text-[var(--text-secondary)]">Detail page: /wishlist/{place.detailSlug}</p>
                          ) : null}
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

                      <form action={updateWishlistPlaceAction} className="mt-5 grid gap-4 rounded-xl border border-[var(--border)] bg-[var(--background)]/40 p-4" data-testid="admin-wishlist-update-form">
                        <input name="id" type="hidden" value={place.id} />
                        <div className="grid gap-4 md:grid-cols-2">
                          <label className="block text-sm text-[var(--text-secondary)]">
                            <span className="mb-1 block font-medium text-[var(--text-primary)]">Name</span>
                            <input className="w-full rounded-lg border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-2 text-[var(--input-text)]" defaultValue={place.name} name="name" required type="text" />
                          </label>
                          <WishlistLocationAutocomplete defaultLocationName={place.locationName} />
                        </div>

                        {/* Item type */}
                        <fieldset>
                          <legend className="mb-2 text-sm font-medium text-[var(--text-primary)]">Item type</legend>
                          <div className="flex flex-wrap gap-4 text-sm text-[var(--text-secondary)]">
                            <label className="inline-flex items-center gap-2">
                              <input defaultChecked={place.itemType !== "multi"} name="itemType" type="radio" value="single" />
                              Single location
                            </label>
                            <label className="inline-flex items-center gap-2">
                              <input defaultChecked={place.itemType === "multi"} name="itemType" type="radio" value="multi" />
                              Multi-site area
                            </label>
                          </div>
                        </fieldset>

                        <label className="block text-sm text-[var(--text-secondary)]">
                          <span className="mb-1 block font-medium text-[var(--text-primary)]">Short description <span className="font-normal text-[var(--text-secondary)]">(optional, max 500 chars)</span></span>
                          <textarea className="w-full rounded-lg border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-2 text-[var(--input-text)]" defaultValue={place.description ?? ""} maxLength={500} name="description" rows={2} />
                        </label>
                        <label className="block text-sm text-[var(--text-secondary)]">
                          <span className="mb-1 block font-medium text-[var(--text-primary)]">Sort order</span>
                          <input className="w-full rounded-lg border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-2 text-[var(--input-text)]" defaultValue={place.sortOrder} name="sortOrder" step="1" type="number" />
                        </label>
                        <label className="block text-sm text-[var(--text-secondary)]">
                          <span className="mb-1 block font-medium text-[var(--text-primary)]">Optional link</span>
                          <input className="w-full rounded-lg border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-2 text-[var(--input-text)]" defaultValue={place.externalUrl ?? ""} name="externalUrl" placeholder="https://example.com/place-guide" type="url" />
                        </label>
                        <label className="block text-sm text-[var(--text-secondary)]">
                          <span className="mb-1 block font-medium text-[var(--text-primary)]">Visited year <span className="font-normal text-[var(--text-secondary)]">(optional)</span></span>
                          <input className="w-full rounded-lg border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-2 text-[var(--input-text)]" defaultValue={place.visitedYear ?? ""} name="visitedYear" placeholder="2026" step="1" type="number" />
                        </label>
                        <label className="block text-sm text-[var(--text-secondary)]">
                          <span className="mb-1 block font-medium text-[var(--text-primary)]">Image URL <span className="font-normal text-[var(--text-secondary)]">(optional HTTPS image)</span></span>
                          <input className="w-full rounded-lg border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-2 text-[var(--input-text)]" defaultValue={place.imageUrl ?? ""} name="imageUrl" placeholder="https://images.example.com/place.jpg" type="url" />
                        </label>
                        <label className="block text-sm text-[var(--text-secondary)]">
                          <span className="mb-1 block font-medium text-[var(--text-primary)]">Detail page slug <span className="font-normal text-[var(--text-secondary)]">(optional; required for multi-site)</span></span>
                          <input className="w-full rounded-lg border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-2 text-[var(--input-text)]" defaultValue={place.detailSlug ?? ""} name="detailSlug" placeholder="banff-gondola" type="text" />
                        </label>

                        {/* Parent selection — only sensible for single items */}
                        {place.itemType !== "multi" && multiPlaces.length > 0 ? (
                          <label className="block text-sm text-[var(--text-secondary)]">
                            <span className="mb-1 block font-medium text-[var(--text-primary)]">Parent area <span className="font-normal text-[var(--text-secondary)]">(optional)</span></span>
                            <select className="w-full rounded-lg border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-2 text-[var(--input-text)]" defaultValue={place.parentId ?? ""} name="parentId">
                              <option value="">— None —</option>
                              {multiPlaces
                                .filter((mp) => mp.id !== place.id)
                                .map((mp) => (
                                  <option key={mp.id} value={mp.id}>{mp.name}</option>
                                ))}
                            </select>
                          </label>
                        ) : null}

                        <div className="flex flex-wrap gap-4 text-sm text-[var(--text-secondary)]">
                          <label className="inline-flex items-center gap-2">
                            <input defaultChecked={place.visited} name="visited" type="checkbox" />
                            Visited already
                          </label>
                          <label className="inline-flex items-center gap-2">
                            <input defaultChecked={place.isPublic} name="isPublic" type="checkbox" />
                            Show publicly
                          </label>
                          <label className="inline-flex items-center gap-2">
                            <input defaultChecked={place.isPinned} name="isPinned" type="checkbox" />
                            Pin to top of list
                          </label>
                        </div>
                        <div className="flex flex-wrap items-center gap-3">
                          <button className="btn-primary rounded-lg px-4 py-2 text-sm font-semibold" type="submit">
                            Update destination
                          </button>
                        </div>
                      </form>

                      <form action={deleteWishlistPlaceAction} className="mt-3" data-testid="admin-wishlist-delete-form">
                        <input name="id" type="hidden" value={place.id} />
                        <button className="rounded-lg border border-red-500/30 px-4 py-2 text-sm font-semibold text-red-600 transition-colors hover:border-red-400 hover:text-red-700" type="submit">
                          Delete destination
                        </button>
                      </form>

                      <form action={checkOffWishlistPlaceAction} className="mt-3 flex flex-wrap items-end gap-3" data-testid="admin-wishlist-checkoff-form">
                        <input name="id" type="hidden" value={place.id} />
                        <label className="block text-sm text-[var(--text-secondary)]">
                          <span className="mb-1 block font-medium text-[var(--text-primary)]">Link to published post <span className="font-normal text-[var(--text-secondary)]">(post id — clears from public wishlist on publish)</span></span>
                          <input
                            className="w-72 rounded-lg border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-2 text-sm text-[var(--input-text)]"
                            defaultValue={place.linkedPostId ?? ""}
                            name="linkedPostId"
                            placeholder="Leave blank to unlink"
                            type="text"
                          />
                        </label>
                        <button className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm font-semibold text-[var(--text-secondary)] transition-colors hover:border-[var(--primary)] hover:text-[var(--primary)]" type="submit">
                          {place.linkedPostId ? "Update link" : "Link post"}
                        </button>
                      </form>
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
