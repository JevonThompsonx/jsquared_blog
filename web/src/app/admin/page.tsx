import Link from "next/link";
import { cookies } from "next/headers";
import { z } from "zod";

import { updateAdminPostAction } from "@/app/admin/actions";
import { AdminDashboard } from "@/components/admin/admin-dashboard";
import { PostEditorForm } from "@/components/admin/post-editor-form";
import { AdminAuthButton } from "@/components/auth/admin-auth-button";
import { SiteHeader } from "@/components/layout/site-header";
import { adminNavLinks } from "@/lib/admin/navigation";
import { ADMIN_FLASH_COOKIE_NAME, isAdminFlashKind } from "@/lib/admin-flash";
import { isAdminAuthConfigured } from "@/lib/auth/admin";
import { requireAdminSession } from "@/lib/auth/session";
import { getPostHref } from "@/lib/utils";
import { getAdminEditablePostById, listAllAdminTags, type AdminPostListResult } from "@/server/dal/admin-posts";
import { listAllSeries } from "@/server/dal/series";
import { parseAdminPostListSearchParams } from "@/server/forms/admin-post-list";
import { getAdminDashboardData, getAdminDashboardMetadata } from "@/server/queries/admin-dashboard";

const adminEditPostIdSchema = z.string().trim().min(1).max(128);
type AdminReturnRoute = "/admin" | `/admin?${string}`;

function getAdminReturnTo(searchParams: Record<string, string | undefined>): AdminReturnRoute {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(searchParams)) {
    if (!value) {
      continue;
    }

    if (key === "postId" || key === "saved" || key === "cloned" || key === "editRemoved") {
      continue;
    }

    params.set(key, value);
  }

  const query = params.toString();
  return query ? `/admin?${query}` : "/admin";
}

export default async function AdminPage({
  searchParams,
}: {
  searchParams?: Promise<{
    error?: string;
    query?: string;
    status?: string;
    page?: string;
    pageSize?: string;
    sort?: string;
    search?: string;
    category?: string;
    saved?: string;
    cloned?: string;
    editRemoved?: string;
    postId?: string;
  }>;
}) {
  const session = await requireAdminSession();
  const authConfigured = isAdminAuthConfigured();
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const cookieStore = await cookies();
  const flashCookieValue = cookieStore.get(ADMIN_FLASH_COOKIE_NAME)?.value;
  const flashKind = isAdminFlashKind(flashCookieValue) ? flashCookieValue : null;

  const parsedEditPostId = adminEditPostIdSchema.safeParse(resolvedSearchParams.postId);
  const selectedPostId = parsedEditPostId.success ? parsedEditPostId.data : null;
  const returnTo = getAdminReturnTo(resolvedSearchParams);

  const [dashboardData, metadata, editablePost, allSeries, allTags] = session?.user?.role === "admin" 
    ? await Promise.all([
        getAdminDashboardData(parseAdminPostListSearchParams(resolvedSearchParams)),
        getAdminDashboardMetadata(),
        selectedPostId ? getAdminEditablePostById(selectedPostId) : Promise.resolve(null),
        listAllSeries(),
        listAllAdminTags(),
      ])
    : [null, null, null, [], []];

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

        {flashKind === "saved" && resolvedSearchParams?.saved ? (
          <div className="mt-6 rounded-2xl border border-[var(--color-success-soft-border)] bg-[var(--color-success-soft-bg)] px-4 py-3 text-sm text-[var(--color-success-text)]">
            Post saved successfully.
          </div>
        ) : null}

        {flashKind === "cloned" && resolvedSearchParams?.cloned ? (
          <div className="mt-6 rounded-2xl border border-[var(--color-success-soft-border)] bg-[var(--color-success-soft-bg)] px-4 py-3 text-sm text-[var(--color-success-text)]">
            Draft clone created successfully.
          </div>
        ) : null}

        {flashKind === "editRemoved" && resolvedSearchParams?.editRemoved ? (
          <div className="mt-6 rounded-2xl border border-[var(--color-warning-soft-border)] bg-[var(--color-warning-soft-bg)] px-4 py-3 text-sm text-[var(--color-warning-text)]">
            The legacy post edit route has moved into the admin dashboard.
          </div>
        ) : null}

        {resolvedSearchParams?.postId && !editablePost && selectedPostId ? (
          <div className="mt-6 rounded-2xl border border-[var(--color-warning-soft-border)] bg-[var(--color-warning-soft-bg)] px-4 py-3 text-sm text-[var(--color-warning-text)]">
            The selected post could not be loaded.
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
            {editablePost ? (
              <section className="mt-8 rounded-2xl border border-[var(--border)] bg-[var(--background)]/70 p-5 shadow-sm sm:p-6" aria-label="Edit selected post">
                <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.22em] text-[var(--accent)]">Inline editor</p>
                    <h2 className="mt-2 text-2xl font-semibold text-[var(--foreground)]">Edit post</h2>
                    <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--text-secondary)]">
                      Update the selected post without leaving the dashboard.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    {editablePost.status === "published" ? (
                      <Link
                        className="rounded-full border border-[var(--border)] px-4 py-2 text-sm font-semibold text-[var(--foreground)] transition-colors hover:bg-[var(--accent-soft)] hover:text-[var(--accent)]"
                        href={getPostHref({ id: editablePost.id, title: editablePost.title, slug: editablePost.slug })}
                      >
                        View live
                      </Link>
                    ) : null}
                      <Link
                        className="rounded-full border border-[var(--border)] px-4 py-2 text-sm font-semibold text-[var(--foreground)] transition-colors hover:bg-[var(--accent-soft)] hover:text-[var(--accent)]"
                        href={returnTo}
                      >
                        Close editor
                      </Link>
                  </div>
                </div>

                <PostEditorForm
                  action={updateAdminPostAction.bind(null, editablePost.id)}
                  allSeries={allSeries}
                  allTags={allTags}
                  categories={metadata?.categories ?? []}
                  mode="edit"
                  post={editablePost}
                  returnTo={returnTo}
                />
              </section>
            ) : null}

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
