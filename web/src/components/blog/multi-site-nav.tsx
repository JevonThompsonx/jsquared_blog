"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback } from "react";

type SiblingSite = {
  id: string;
  name: string;
  detailSlug: string | null;
};

type MultiSiteNavProps = {
  siblings: SiblingSite[];
  currentId: string;
  currentName: string;
};

export function MultiSiteNav({ siblings, currentId, currentName }: MultiSiteNavProps) {
  const router = useRouter();

  const handleSelectChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const slug = e.target.value;
      if (slug) {
        router.push(`/wishlist/${slug}`);
      }
    },
    [router],
  );

  const currentSlug = siblings.find((s) => s.id === currentId)?.detailSlug ?? "";

  if (siblings.length === 0) {
    return null;
  }

  return (
    <>
      {/* Desktop sidebar */}
      <nav
        aria-label="Other destinations"
        className="hidden md:block"
        data-testid="multi-site-sidebar"
      >
        <div className="sticky top-24">
          <h2 className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-[var(--text-secondary)]">
            Other destinations
          </h2>
          <ul className="space-y-1">
            {siblings.map((site) => (
              <li key={site.id}>
                {site.detailSlug ? (
                  <Link
                    className={`block rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                      site.id === currentId
                        ? "bg-[var(--accent-soft)] text-[var(--accent)]"
                        : "text-[var(--text-secondary)] hover:bg-[var(--accent-soft)] hover:text-[var(--accent)]"
                    }`}
                    href={`/wishlist/${site.detailSlug}`}
                  >
                    {site.name}
                  </Link>
                ) : (
                  <span className="block px-3 py-2 text-sm font-medium text-[var(--text-secondary)]">
                    {site.name}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      </nav>

      {/* Mobile dropdown */}
      <div className="md:hidden" data-testid="multi-site-dropdown">
        <label className="mb-1 block text-xs font-bold uppercase tracking-[0.18em] text-[var(--text-secondary)]" htmlFor="multi-site-select">
          Switch destination
        </label>
        <select
          className="w-full rounded-lg border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-2 text-sm text-[var(--input-text)]"
          id="multi-site-select"
          onChange={handleSelectChange}
          value={currentSlug}
        >
          <option value="">{currentName} (current)</option>
          {siblings.map((site) =>
            site.detailSlug ? (
              <option key={site.id} value={site.detailSlug}>
                {site.name}
              </option>
            ) : null,
          )}
        </select>
      </div>
    </>
  );
}
