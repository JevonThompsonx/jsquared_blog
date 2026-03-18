import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { SiteHeader } from "@/components/layout/site-header";
import { requireAdminSession } from "@/lib/auth/session";
import { getAdminEditablePostById } from "@/server/dal/admin-posts";
import { AdminCommentsPanel } from "@/components/admin/admin-comments-panel";

export default async function AdminPostCommentsPage({
  params,
}: {
  params: Promise<{ postId: string }>;
}) {
  const session = await requireAdminSession();
  if (!session) {
    redirect("/admin");
  }

  const { postId } = await params;
  const post = await getAdminEditablePostById(postId);

  if (!post) {
    notFound();
  }

  return (
    <main id="main-content" className="min-h-screen px-4 pb-12 pt-24 sm:px-6 lg:px-8" style={{ background: "var(--background)" }}>
      <SiteHeader />
      <section className="container mx-auto mt-8 max-w-[min(92rem,calc(100vw-2rem))] sm:mt-10">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[var(--accent)]">Moderation tools</p>
            <h1 className="mt-2 text-3xl font-semibold text-[var(--foreground)] sm:text-4xl">Comments on &quot;{post.title}&quot;</h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--text-secondary)]">
              Review full threads, preserve context for hidden or deleted replies, and keep moderation decisions visible without leaving the post workspace.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link className="rounded-full border border-[var(--border)] px-4 py-2 text-sm font-semibold text-[var(--foreground)] transition-colors hover:bg-[var(--accent-soft)] hover:text-[var(--accent)]" href={`/admin/posts/${postId}/edit`}>
              Back to editor
            </Link>
            <Link className="rounded-full border border-[var(--border)] px-4 py-2 text-sm font-semibold text-[var(--foreground)] transition-colors hover:bg-[var(--accent-soft)] hover:text-[var(--accent)]" href="/admin">
              Back to dashboard
            </Link>
          </div>
        </div>

        <AdminCommentsPanel postId={postId} />
      </section>
    </main>
  );
}
