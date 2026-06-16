import Link from "next/link";
import { redirect } from "next/navigation";

import { SiteHeader } from "@/components/layout/site-header";
import { requireAdminSession } from "@/lib/auth/session";
import { listAllTagsWithCounts, type AdminTagRecord } from "@/server/dal/admin-tags";

import { createTagAction, deleteTagAction, updateTagDescriptionAction } from "./actions";

type SearchParams = Record<string, string | string[] | undefined>;

function getSingleParam(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

function formatError(params: SearchParams): string | null {
  const error = getSingleParam(params.error);
  switch (error) {
    case "InvalidTag":
      return "Please check the tag form fields and try again.";
    case "SlugTaken":
      return "Another tag already uses that slug. Please pick a unique slug.";
    case "TagInUse": {
      const posts = getSingleParam(params.posts) ?? "0";
      return `Cannot delete: ${posts} post(s) still use this tag. Detach the tag from the posts first.`;
    }
    default:
      return null;
  }
}

export default async function AdminTagsPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const session = await requireAdminSession();
  if (session?.user?.role !== "admin") {
    redirect("/admin");
  }

  const params = (await searchParams) ?? {};
  const errorMessage = formatError(params);

  let tagsList: AdminTagRecord[] = [];
  let loadFailed = false;
  try {
    tagsList = await listAllTagsWithCounts();
  } catch (error) {
    console.error("[admin tags] Failed to load tags", error);
    loadFailed = true;
  }

  return (
    <main id="main-content" className="min-h-screen px-4 pb-12 pt-24 sm:px-6 lg:px-8" style={{ background: "var(--background)" }}>
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

        {errorMessage ? (
          <div
            className="mb-6 rounded-2xl border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-700"
            data-testid="admin-tags-error"
            role="alert"
          >
            {errorMessage}
          </div>
        ) : null}

        <div className="grid gap-6 lg:grid-cols-[minmax(0,28rem)_minmax(0,1fr)]">
          <form
            action={createTagAction}
            className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-6 shadow-xl"
            data-testid="admin-tags-create-form"
          >
            <h2 className="text-xl font-semibold text-[var(--text-primary)]">Create tag</h2>
            <div className="mt-5 space-y-4">
              <label className="block text-sm text-[var(--text-secondary)]">
                <span className="mb-1 block font-medium text-[var(--text-primary)]">Name</span>
                <input
                  className="w-full rounded-lg border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-2 text-[var(--input-text)]"
                  maxLength={120}
                  name="name"
                  required
                  type="text"
                />
              </label>
              <label className="block text-sm text-[var(--text-secondary)]">
                <span className="mb-1 block font-medium text-[var(--text-primary)]">
                  Slug <span className="font-normal text-[var(--text-secondary)]">(optional — auto-generated from name)</span>
                </span>
                <input
                  className="w-full rounded-lg border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-2 text-[var(--input-text)]"
                  maxLength={120}
                  name="slug"
                  pattern="^[a-z0-9]+(?:-[a-z0-9]+)*$"
                  placeholder="overlanding"
                  type="text"
                />
              </label>
              <label className="block text-sm text-[var(--text-secondary)]">
                <span className="mb-1 block font-medium text-[var(--text-primary)]">
                  Description <span className="font-normal text-[var(--text-secondary)]">(optional, max 500 chars)</span>
                </span>
                <textarea
                  className="w-full rounded-lg border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-2 text-[var(--input-text)]"
                  maxLength={500}
                  name="description"
                  rows={3}
                />
              </label>
              <button
                className="btn-primary rounded-lg px-4 py-2 text-sm font-semibold transition-opacity hover:opacity-90"
                type="submit"
              >
                Create tag
              </button>
            </div>
          </form>

          <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] shadow-xl">
            {loadFailed ? (
              <p className="px-6 py-10 text-center text-sm text-[var(--text-secondary)]">
                Tag data is temporarily unavailable. Please try again later.
              </p>
            ) : tagsList.length === 0 ? (
              <p className="px-6 py-10 text-center text-sm text-[var(--text-secondary)]" data-testid="admin-tags-empty">
                No tags yet. Use the form on the left to create the first one — they will also appear here
                automatically when added to posts.
              </p>
            ) : (
              <ul className="divide-y divide-[var(--border)]" data-testid="admin-tags-list">
                {tagsList.map((tag) => (
                  <li
                    key={tag.id}
                    className="px-5 py-5 sm:px-7 lg:px-8"
                    data-tag-id={tag.id}
                    data-testid="admin-tag-row"
                  >
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

                        <div className="flex w-full flex-col gap-3">
                          <form
                            key={`${tag.id}:${tag.description ?? ""}`}
                            action={updateTagDescriptionAction}
                            className="flex w-full flex-col gap-3 md:flex-row md:items-start"
                            data-testid="admin-tag-description-form"
                          >
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
                          <form action={deleteTagAction} className="flex" data-testid="admin-tag-delete-form">
                            <input name="id" type="hidden" value={tag.id} />
                            <button
                              aria-label={`Delete tag ${tag.name}`}
                              className="rounded-lg border border-red-500/30 px-3 py-1.5 text-xs font-semibold text-red-600 transition-colors hover:border-red-400 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                              disabled={tag.postCount > 0}
                              title={
                                tag.postCount > 0
                                  ? `Cannot delete: ${tag.postCount} post(s) still use this tag.`
                                  : `Delete tag ${tag.name}`
                              }
                              type="submit"
                            >
                              Delete tag
                            </button>
                          </form>
                        </div>
                      </div>
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
