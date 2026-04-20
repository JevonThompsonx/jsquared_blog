import Link from "next/link";
import { redirect } from "next/navigation";

import { SiteHeader } from "@/components/layout/site-header";
import { requireAdminSession } from "@/lib/auth/session";
import { listAllSeasons, type SeasonRecord } from "@/server/dal/seasons";

import { deleteSeasonAction, upsertSeasonAction } from "./actions";

const SEASON_NAMES: readonly ["Winter", "Spring", "Summer", "Fall"] = ["Winter", "Spring", "Summer", "Fall"];

/** Generate season key + label options for ±2 years from today. */
function generateSeasonOptions(): { key: string; label: string }[] {
  const now = new Date();
  const currentYear = now.getUTCFullYear();
  const options: { key: string; label: string }[] = [];

  for (let year = currentYear - 2; year <= currentYear + 2; year++) {
    for (let seasonNum = 1; seasonNum <= 4; seasonNum++) {
      const seasonName = SEASON_NAMES[seasonNum - 1]!;
      options.push({ key: `${year}-${seasonNum}`, label: `${seasonName} ${year}` });
    }
  }

  // Most recent seasons first
  return options.reverse();
}

export default async function AdminSeasonsPage() {
  const session = await requireAdminSession();
  if (session?.user?.role !== "admin") {
    redirect("/admin");
  }

  let seasonsList: SeasonRecord[] = [];
  let loadFailed = false;

  try {
    seasonsList = await listAllSeasons();
  } catch (error) {
    console.error("[admin seasons] Failed to load seasons", error);
    loadFailed = true;
  }

  const seasonOptions = generateSeasonOptions();

  // Map of seasonKey → displayName for existing overrides
  const overrideMap = new Map(seasonsList.map((s) => [s.seasonKey, s.displayName]));

  return (
    <main
      id="main-content"
      className="min-h-screen px-4 pb-12 pt-24 sm:px-6 lg:px-8"
      style={{ background: "var(--background)" }}
    >
      <SiteHeader />

      <section className="container mx-auto max-w-[min(72rem,calc(100vw-2rem))]">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-[var(--accent)]">Admin</p>
            <h1 className="mt-1 text-3xl font-bold text-[var(--text-primary)]">Season Names</h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--text-secondary)]">
              Override the auto-generated season labels shown on the homepage feed. Deleting an override reverts to
              the automatic name (e.g. &ldquo;Spring 2026&rdquo;).
            </p>
          </div>
          <Link
            className="rounded-full border border-[var(--border)] px-4 py-2 text-sm font-semibold text-[var(--text-secondary)] transition-colors hover:border-[var(--primary)] hover:text-[var(--primary)]"
            href="/admin"
          >
            ← Dashboard
          </Link>
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)]">
          {/* Add / Edit form */}
          <form
            action={upsertSeasonAction}
            className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-6 shadow-xl"
            data-testid="admin-seasons-upsert-form"
          >
            <h2 className="text-xl font-semibold text-[var(--text-primary)]">Add or update override</h2>
            <div className="mt-5 space-y-4">
              <label className="block text-sm text-[var(--text-secondary)]">
                Season
                <select
                  name="seasonKey"
                  required
                  className="mt-1 block w-full rounded-lg border border-[var(--border)] bg-[var(--input-bg,var(--card-bg))] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--primary)] focus:outline-none"
                >
                  <option value="">— choose a season —</option>
                  {seasonOptions.map(({ key, label }) => (
                    <option key={key} value={key}>
                      {label}{overrideMap.has(key) ? " ✎" : ""}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block text-sm text-[var(--text-secondary)]">
                Display name
                <input
                  maxLength={100}
                  name="displayName"
                  placeholder="e.g. The Colorado Road Trip"
                  required
                  type="text"
                  className="mt-1 block w-full rounded-lg border border-[var(--border)] bg-[var(--input-bg,var(--card-bg))] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:border-[var(--primary)] focus:outline-none"
                />
              </label>
            </div>

            <button
              type="submit"
              className="mt-5 rounded-full bg-[var(--primary)] px-5 py-2 text-sm font-semibold text-[var(--btn-text,white)] transition-opacity hover:opacity-90"
            >
              Save override
            </button>
          </form>

          {/* Current overrides list */}
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] shadow-xl">
            <h2 className="border-b border-[var(--border)] px-6 py-4 text-xl font-semibold text-[var(--text-primary)]">
              Current overrides
            </h2>

            {loadFailed ? (
              <p className="px-6 py-10 text-center text-sm text-[var(--text-secondary)]">
                Could not load season overrides. Please refresh to retry.
              </p>
            ) : seasonsList.length === 0 ? (
              <p className="px-6 py-10 text-center text-sm text-[var(--text-secondary)]">
                No custom season names yet. All seasons display their auto-generated labels.
              </p>
            ) : (
              <ul className="divide-y divide-[var(--border)]" data-testid="admin-seasons-list">
                {seasonsList.map((season) => {
                  const autoLabel =
                    seasonOptions.find((o) => o.key === season.seasonKey)?.label ?? season.seasonKey;

                  return (
                    <li key={season.id} className="flex items-center justify-between gap-4 px-6 py-4">
                      <div>
                        <p className="font-semibold text-[var(--text-primary)]">{season.displayName}</p>
                        <p className="mt-0.5 text-xs text-[var(--text-secondary)]">
                          <span className="font-mono">{season.seasonKey}</span>
                          {" · "}was: {autoLabel}
                        </p>
                      </div>

                      <form action={deleteSeasonAction}>
                        <input type="hidden" name="seasonKey" value={season.seasonKey} />
                        <button
                          type="submit"
                          className="rounded-full border border-[var(--border)] px-3 py-1 text-xs font-semibold text-[var(--text-secondary)] transition-colors hover:border-red-500 hover:text-red-500"
                          aria-label={`Remove override for ${season.displayName}`}
                        >
                          Remove
                        </button>
                      </form>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
