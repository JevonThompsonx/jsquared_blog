import Link from "next/link";
import { redirect } from "next/navigation";

import { SiteHeader } from "@/components/layout/site-header";
import { requireAdminSession } from "@/lib/auth/session";
import { captureException } from "@/lib/sentry";
import { listAllCategoriesWithCounts, type AdminCategoryRecord } from "@/server/dal/categories";

import { createCategoryAction, deleteCategoryAction, updateCategoryAction } from "./actions";

function formatDate(date: Date): string {
  return date.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

type SearchParams = Record<string, string | string[] | undefined>;

function getSingleParam(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

export default async function AdminCategoriesPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const session = await requireAdminSession();
  if (session?.user?.role !== "admin") {
    redirect("/admin");
  }

  const params = (await searchParams) ?? {};
  const error = getSingleParam(params.error);
  const errorMessage = (() => {
    switch (error) {
      case "InvalidCategory":
        return "Please check the category form fields and try again.";
      case "SlugTaken":
        return "Another category already uses that slug. Please pick a unique slug.";
      case "CategoryInUse": {
        const posts = getSingleParam(params.posts) ?? "0";
        return `Cannot delete: ${posts} post(s) still use this category. Reassign or delete the posts first.`;
      }
      default:
        return null;
    }
  })();

  let categoriesList: AdminCategoryRecord[] = [];
  let loadFailed = false;
  try {
    categoriesList = await listAllCategoriesWithCounts();
  } catch (error) {
    // C13: capture in Sentry so on-call gets paged; keep the local
    // console.error for dev-time visibility (mirrors the pattern used
    // elsewhere in the admin app).
    captureException(error, { area: "admin-categories" });
    console.error("[admin categories] Failed to load categories", error);
    loadFailed = true;
  }

  return (
    <main
      id="main-content"
      className="min-h-screen px-4 pb-12 pt-24 sm:px-6 lg:px-8"
      style={{ background: "var(--background)" }}
    >
      <SiteHeader />

      <section className="container mx-auto max-w-[min(92rem,calc(100vw-2rem))]">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-[var(--accent)]">Admin</p>
            <h1 className="mt-1 text-3xl font-bold text-[var(--text-primary)]">Manage Categories</h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--text-secondary)]">
              Curate the section names used to group stories. Categories with posts cannot be deleted — reassign or
              delete the posts first.
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
            data-testid="admin-categories-error"
            role="alert"
          >
            {errorMessage}
          </div>
        ) : null}

        <div className="grid gap-6 lg:grid-cols-[minmax(0,28rem)_minmax(0,1fr)]">
          <form
            action={createCategoryAction}
            className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-6 shadow-xl"
            data-testid="admin-categories-create-form"
          >
            <h2 className="text-xl font-semibold text-[var(--text-primary)]">Create category</h2>
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
                  placeholder="desert-camping"
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
                Create category
              </button>
            </div>
          </form>

          <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] shadow-xl">
            {loadFailed ? (
              <p
                className="px-6 py-10 text-center text-sm text-[var(--text-secondary)]"
                data-testid="admin-categories-load-failed"
              >
                Category data is temporarily unavailable. Please try again later.
              </p>
            ) : categoriesList.length === 0 ? (
              <p className="px-6 py-10 text-center text-sm text-[var(--text-secondary)]" data-testid="admin-categories-empty">
                No categories yet. Create the first one using the form on the left.
              </p>
            ) : (
              <ul className="divide-y divide-[var(--border)]" data-testid="admin-categories-list">
                {categoriesList.map((category) => (
                  <li
                    key={category.id}
                    className="px-5 py-5 sm:px-7 lg:px-8"
                    data-category-id={category.id}
                    data-testid="admin-category-row"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2 xl:gap-3">
                          <span className="font-semibold text-[var(--text-primary)]">{category.name}</span>
                          <span className="rounded-full bg-[var(--accent-soft)] px-2 py-0.5 text-xs font-semibold text-[var(--accent)]">
                            {category.postCount} {category.postCount === 1 ? "post" : "posts"}
                          </span>
                          <span className="text-xs text-[var(--text-secondary)]">/category/{category.slug}</span>
                        </div>
                        {category.description ? (
                          <p className="mt-2 max-w-2xl text-sm leading-7 text-[var(--text-secondary)]">
                            {category.description}
                          </p>
                        ) : null}
                        <p className="mt-1 text-xs text-[var(--text-secondary)]">
                          Created {formatDate(category.createdAt)} · Updated {formatDate(category.updatedAt)}
                        </p>
                      </div>

                      <form action={deleteCategoryAction} className="flex" data-testid="admin-category-delete-form">
                        <input name="id" type="hidden" value={category.id} />
                        <button
                          aria-label={`Delete category ${category.name}`}
                          className="rounded-lg border border-red-500/30 px-3 py-1.5 text-xs font-semibold text-red-600 transition-colors hover:border-red-400 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                          disabled={category.postCount > 0}
                          title={
                            category.postCount > 0
                              ? `Cannot delete: ${category.postCount} post(s) still use this category.`
                              : `Delete category ${category.name}`
                          }
                          type="submit"
                        >
                          Delete
                        </button>
                      </form>
                    </div>

                    <form
                      action={updateCategoryAction}
                      className="mt-5 grid gap-4 rounded-xl border border-[var(--border)] bg-[var(--background)]/40 p-4"
                      data-testid="admin-category-update-form"
                    >
                      <input name="id" type="hidden" value={category.id} />
                      <div className="grid gap-4 md:grid-cols-2">
                        <label className="block text-sm text-[var(--text-secondary)]">
                          <span className="mb-1 block font-medium text-[var(--text-primary)]">Name</span>
                          <input
                            className="w-full rounded-lg border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-2 text-[var(--input-text)]"
                            defaultValue={category.name}
                            maxLength={120}
                            name="name"
                            required
                            type="text"
                          />
                        </label>
                        <label className="block text-sm text-[var(--text-secondary)]">
                          <span className="mb-1 block font-medium text-[var(--text-primary)]">Slug</span>
                          <input
                            className="w-full rounded-lg border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-2 text-[var(--input-text)]"
                            defaultValue={category.slug}
                            maxLength={120}
                            name="slug"
                            pattern="^[a-z0-9]+(?:-[a-z0-9]+)*$"
                            type="text"
                          />
                        </label>
                      </div>
                      <label className="block text-sm text-[var(--text-secondary)]">
                        <span className="mb-1 block font-medium text-[var(--text-primary)]">
                          Description <span className="font-normal text-[var(--text-secondary)]">(optional, max 500 chars)</span>
                        </span>
                        <textarea
                          className="w-full rounded-lg border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-2 text-[var(--input-text)]"
                          defaultValue={category.description ?? ""}
                          maxLength={500}
                          name="description"
                          rows={3}
                        />
                      </label>
                      <div className="flex flex-wrap items-center gap-3">
                        <button
                          className="btn-primary rounded-lg px-4 py-2 text-sm font-semibold transition-opacity hover:opacity-90"
                          type="submit"
                        >
                          Save changes
                        </button>
                      </div>
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
