import Link from "next/link";
import { redirect } from "next/navigation";

import { SiteHeader } from "@/components/layout/site-header";
import { requireAdminSession } from "@/lib/auth/session";
import { listAllTagsWithCounts } from "@/server/dal/admin-tags";
import { updateTagDescriptionAction } from "./actions";

export default async function AdminTagsPage() {
  const session = await requireAdminSession();
  if (session?.user?.role !== "admin") {
    redirect("/admin");
  }

  const tagsList = await listAllTagsWithCounts();

  return (
    <main className="min-h-screen px-4 pb-12 pt-24 sm:px-6 lg:px-8" style={{ background: "var(--background)" }}>
      <SiteHeader />

      <section className="container mx-auto max-w-[min(92rem,calc(100vw-2rem))]">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-[var(--accent)]">Admin</p>
            <h1 className="mt-1 text-3xl font-bold text-[var(--text-primary)]">Manage Tags</h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--text-secondary)]">
              Keep tag descriptions crisp and browse-friendly so archive pages feel curated instead of auto-generated.
            </p>
          </div>
          <Link
            className="rounded-full border border-[var(--border)] px-4 py-2 text-sm font-semibold text-[var(--text-secondary)] transition-colors hover:border-[var(--primary)] hover:text-[var(--primary)]"
            href="/admin"
          >
            ← Dashboard
          </Link>
        </div>

        <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] shadow-xl">
          {tagsList.length === 0 ? (
            <p className="px-6 py-10 text-center text-sm text-[var(--text-secondary)]">
              No tags yet. Tags are created automatically when added to posts.
            </p>
          ) : (
            <ul className="divide-y divide-[var(--border)]">
              {tagsList.map((tag) => (
                <li key={tag.id} className="px-5 py-5 sm:px-7 lg:px-8">
                  <div className="flex items-start gap-4">
                    <div className="grid w-full gap-4 xl:grid-cols-[minmax(0,24rem)_minmax(0,1fr)] xl:items-start xl:gap-6">
                      <div>
                        <div className="flex flex-wrap items-center gap-2 xl:gap-3">
                          <span className="font-semibold text-[var(--text-primary)]">{tag.name}</span>
                          <span className="rounded-full bg-[var(--accent-soft)] px-2 py-0.5 text-xs font-semibold text-[var(--accent)]">
                          {tag.postCount} {tag.postCount === 1 ? "post" : "posts"}
                          </span>
                          <span className="text-xs text-[var(--text-secondary)]">/tag/{tag.slug}</span>
                        </div>
                        <p className="mt-3 max-w-sm text-sm leading-7 text-[var(--text-secondary)]">
                          This copy appears in the tag header and should help readers understand what kind of stories they will find in the archive.
                        </p>
                      </div>

                      <form action={updateTagDescriptionAction} className="flex w-full flex-col gap-3 md:flex-row md:items-start">
                        <input name="tagId" type="hidden" value={tag.id} />
                        <textarea
                          className="min-h-[96px] flex-1 resize-y rounded-lg border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-3 text-sm leading-6 text-[var(--input-text)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
                          defaultValue={tag.description ?? ""}
                          maxLength={500}
                          name="description"
                          placeholder="Short description shown on the tag page…"
                          rows={2}
                        />
                        <button
                          className="btn-primary shrink-0 self-stretch rounded-lg px-4 py-2 text-sm font-semibold transition-opacity hover:opacity-90 md:self-auto xl:self-start"
                          type="submit"
                        >
                          Save
                        </button>
                      </form>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </main>
  );
}
