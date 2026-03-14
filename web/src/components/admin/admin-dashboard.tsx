import Link from "next/link";

import type { AdminSession } from "@/lib/auth/session";
import { formatPublishedDate } from "@/lib/utils";
import type { AdminPostRecord } from "@/server/dal/admin-posts";

function getStatusStyles(status: AdminPostRecord["status"]) {
  switch (status) {
    case "published":
      return "bg-emerald-100 text-emerald-900";
    case "scheduled":
      return "bg-amber-100 text-amber-900";
    default:
      return "bg-slate-200 text-slate-800";
  }
}

export function AdminDashboard({
  session,
  counts,
  posts,
}: {
  session: AdminSession;
  counts: { total: number; published: number; draft: number; scheduled: number };
  posts: AdminPostRecord[];
}) {
  return (
    <div className="mt-10 space-y-8">
      <section className="rounded-lg border border-[var(--border)] bg-[var(--card-bg)] p-6 shadow-xl sm:p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[var(--accent)]">Authorized</p>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold text-[var(--foreground)]">Welcome back, {session.user?.githubLogin ?? session.user?.email ?? "admin"}.</h2>
            <p className="mt-2 max-w-2xl text-sm leading-7 text-[var(--muted)]">
              This is the new Next.js admin home. It already reads directly from Turso and reflects mirrored legacy writes while native create and edit flows are being ported.
            </p>
          </div>
          <Link
            className="rounded-full border border-[var(--border)] px-4 py-2 text-sm font-semibold text-[var(--foreground)]"
            href="/"
          >
            Back to site
          </Link>
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          <a className="rounded-full bg-[var(--accent-strong)] px-4 py-2 text-sm font-semibold text-white" href="/admin/posts/new">
            Create new post
          </a>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        {[
          ["Total posts", counts.total],
          ["Published", counts.published],
          ["Drafts", counts.draft],
          ["Scheduled", counts.scheduled],
        ].map(([label, value]) => (
          <div key={label} className="rounded-lg border border-[var(--border)] bg-[var(--card-bg)] p-5 shadow-xl">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--accent)]">{label}</p>
            <p className="mt-3 text-3xl font-semibold text-[var(--foreground)]">{value}</p>
          </div>
        ))}
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
        <div className="rounded-lg border border-[var(--border)] bg-[var(--card-bg)] p-6 shadow-xl sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[var(--accent)]">Editorial queue</p>
              <h3 className="mt-2 text-2xl font-semibold text-[var(--foreground)]">Latest posts in Turso</h3>
            </div>
            <span className="text-sm text-[var(--muted)]">24 most recent entries</span>
          </div>

          <div className="mt-6 space-y-4">
            {posts.map((post) => (
              <article key={post.id} className="rounded-lg border border-[var(--border)] bg-[var(--background)] p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] ${getStatusStyles(post.status)}`}>
                        {post.status}
                      </span>
                      {post.category ? <span className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">{post.category}</span> : null}
                    </div>
                    <h4 className="mt-3 text-xl font-semibold text-[var(--foreground)]">{post.title}</h4>
                    <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                      {post.excerpt || "This post is synced into Turso and ready for native admin tooling."}
                    </p>
                  </div>
                  <div className="text-right text-xs uppercase tracking-[0.16em] text-[var(--muted)]">
                    <p>Created</p>
                    <p className="mt-1 text-sm normal-case tracking-normal text-[var(--foreground)]">{formatPublishedDate(post.createdAt.toISOString())}</p>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-[var(--muted)]">
                  <div className="flex flex-wrap gap-4">
                    {post.publishedAt ? <span>Published {formatPublishedDate(post.publishedAt.toISOString())}</span> : null}
                    {post.scheduledPublishTime ? <span>Scheduled {formatPublishedDate(post.scheduledPublishTime.toISOString())}</span> : null}
                  </div>
                  <div className="flex flex-wrap gap-4">
                    <a className="font-semibold text-[var(--accent)]" href={`/admin/posts/${post.id}/edit`}>
                      Edit
                    </a>
                    <Link className="font-semibold text-[var(--accent)]" href={`/posts/${post.slug}`}>
                      Open post
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>

        <aside className="space-y-6">
          <div className="rounded-lg border border-[var(--border)] bg-[var(--card-bg)] p-6 shadow-xl sm:p-8">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[var(--accent)]">Security posture</p>
            <ul className="mt-4 space-y-3 text-sm leading-7 text-[var(--muted)]">
              <li>Auth.js admin access is fail-closed until your GitHub allowlist matches.</li>
              <li>Successful admin sign-ins are mirrored into Turso auth records.</li>
              <li>Legacy writes continue syncing into Turso so read-side drift stays low.</li>
            </ul>
          </div>

          <div className="rounded-lg border border-[var(--border)] bg-[var(--card-bg)] p-6 shadow-xl sm:p-8">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[var(--accent)]">Next migration slice</p>
            <ul className="mt-4 space-y-3 text-sm leading-7 text-[var(--muted)]">
              <li>Native Next.js post creation form</li>
              <li>Turso-first edit/update mutations with tags and media metadata</li>
              <li>Cloudinary-backed uploads still pending</li>
            </ul>
          </div>
        </aside>
      </section>
    </div>
  );
}
