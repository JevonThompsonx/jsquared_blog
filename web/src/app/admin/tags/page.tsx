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

      <section className="container mx-auto max-w-4xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-[var(--accent)]">Admin</p>
            <h1 className="mt-1 text-3xl font-bold text-[var(--text-primary)]">Manage Tags</h1>
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
                <li key={tag.id} className="px-5 py-5 sm:px-7">
                  <div className="flex items-start gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-[var(--text-primary)]">{tag.name}</span>
                        <span className="rounded-full bg-[var(--accent-soft)] px-2 py-0.5 text-xs font-semibold text-[var(--accent)]">
                          {tag.postCount} {tag.postCount === 1 ? "post" : "posts"}
                        </span>
                        <span className="text-xs text-[var(--text-secondary)]">/tag/{tag.slug}</span>
                      </div>

                      <form action={updateTagDescriptionAction} className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end">
                        <input name="tagId" type="hidden" value={tag.id} />
                        <textarea
                          className="min-h-[60px] flex-1 resize-y rounded-lg border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-2 text-sm text-[var(--input-text)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
                          defaultValue={tag.description ?? ""}
                          maxLength={500}
                          name="description"
                          placeholder="Short description shown on the tag page…"
                          rows={2}
                        />
                        <button
                          className="btn-primary shrink-0 rounded-lg px-4 py-2 text-sm font-semibold transition-opacity hover:opacity-90 sm:self-end"
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
