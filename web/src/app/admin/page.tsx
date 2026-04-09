import Link from "next/link";

import { AdminDashboard } from "@/components/admin/admin-dashboard";
import { AdminAuthButton } from "@/components/auth/admin-auth-button";
import { SiteHeader } from "@/components/layout/site-header";
import { adminNavLinks } from "@/lib/admin/navigation";
import { isAdminAuthConfigured } from "@/lib/auth/admin";
import { requireAdminSession } from "@/lib/auth/session";
import type { AdminPostListResult } from "@/server/dal/admin-posts";
import { parseAdminPostListSearchParams } from "@/server/forms/admin-post-list";
import { getAdminDashboardData, getAdminDashboardMetadata } from "@/server/queries/admin-dashboard";

export default async function AdminPage({
  searchParams,
}: {
  searchParams?: Promise<{ error?: string; query?: string; status?: string; page?: string; pageSize?: string; sort?: string; search?: string; category?: string }>;
}) {
  const session = await requireAdminSession();
  const authConfigured = isAdminAuthConfigured();
  const resolvedSearchParams = searchParams ? await searchParams : {};

  const [dashboardData, metadata] = session?.user?.role === "admin" 
    ? await Promise.all([
        getAdminDashboardData(parseAdminPostListSearchParams(resolvedSearchParams)),
        getAdminDashboardMetadata()
      ])
    : [null, null];

  const defaultPostsResult: AdminPostListResult = {
    posts: [],
    totalCount: 0,
    page: 1,
    pageSize: 24,
    totalPages: 1,
    filters: {
      query: "",
      page: 1,
      pageSize: 24,
      sort: "updated-desc",
    },
  };

  return (
    <main id="main-content" className="min-h-screen px-4 pb-12 pt-24 sm:px-6 lg:px-8" style={{ background: "var(--background)" }}>
      <SiteHeader />

      <section className="container mx-auto max-w-[min(92rem,calc(100vw-2rem))] rounded-lg border border-[var(--border)] bg-[var(--card-bg)] p-5 shadow-xl sm:p-8 lg:p-10">
        <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[var(--accent)]">Admin access</p>
        <h1 className="mt-4 text-3xl font-semibold text-[var(--foreground)] sm:text-4xl">Editorial control center</h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-[var(--muted)]">
          Sign in once, then stay focused on writing, refining, and publishing. The system details stay in the background unless you need them.
        </p>

        {!authConfigured ? (
          <div className="mt-8 rounded-[1.5rem] border border-dashed border-[var(--border)] bg-[var(--surface-strong)] p-6 text-sm leading-7 text-[var(--muted)]">
            Admin sign-in is not available right now.
          </div>
        ) : null}

        {resolvedSearchParams?.error ? (
          <div className="mt-6 rounded-2xl border border-[var(--color-warning-soft-border)] bg-[var(--color-warning-soft-bg)] px-4 py-3 text-sm text-[var(--color-warning-text)]">
            Sign-in was denied.
          </div>
        ) : null}

        <div className="mt-6 rounded-2xl border border-[var(--border)] bg-[var(--background)] px-4 py-3 text-sm text-[var(--text-secondary)]">
          For local GitHub sign-in, your GitHub OAuth app also needs `http://localhost:3000/api/auth/callback/github` listed as an allowed callback URL.
        </div>

        <div className="mt-8 flex flex-wrap items-center gap-4">
          <AdminAuthButton disabled={!authConfigured} isSignedIn={Boolean(session?.user?.id)} />
          {session?.user?.id ? (
            <span className="min-w-0 break-all text-sm text-[var(--muted)]">
              Signed in as `{session.user.githubLogin ?? session.user.email ?? session.user.id}`
            </span>
          ) : null}
        </div>

        {session?.user?.role === "admin" ? (
          <>
            <section className="mt-8 rounded-2xl border border-[var(--border)] bg-[var(--background)]/70 p-5 shadow-sm sm:p-6" aria-label="Admin pages">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.22em] text-[var(--accent)]">Admin pages</p>
                  <h2 className="mt-2 text-xl font-semibold text-[var(--foreground)]">Jump straight to the tools you use most.</h2>
                </div>
                <p className="max-w-2xl text-sm leading-6 text-[var(--text-secondary)]">
                  Keep every admin route one click away so wishlist, tags, posts, and dashboard tasks stay easy to find.
                </p>
              </div>

              <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                {adminNavLinks.map((link) => (
                  <Link
                    key={link.href}
                    className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] px-4 py-4 text-left transition-colors hover:border-[var(--accent)] hover:bg-[var(--accent-soft)]/40"
                    href={link.href}
                  >
                    <span className="block text-sm font-semibold text-[var(--foreground)]">{link.label}</span>
                    <span className="mt-2 block text-sm leading-6 text-[var(--text-secondary)]">{link.description}</span>
                  </Link>
                ))}
              </div>
            </section>

            <AdminDashboard
              counts={dashboardData?.counts ?? { total: 0, published: 0, draft: 0, scheduled: 0 }}
              postsResult={dashboardData?.posts ?? defaultPostsResult}
              categories={metadata?.categories ?? []}
              session={session}
            />
          </>
        ) : null}
      </section>
    </main>
  );
}
