import Link from "next/link";
import { notFound } from "next/navigation";

import { PostEditorForm } from "@/components/admin/post-editor-form";
import { SiteHeader } from "@/components/layout/site-header";
import { requireAdminSession } from "@/lib/auth/session";
import { getAdminEditablePostById, listAdminCategories, listAllAdminTags } from "@/server/dal/admin-posts";
import { listAllSeries } from "@/server/dal/series";

import { updateAdminPostAction } from "../../../actions";

export default async function EditAdminPostPage({
  params,
  searchParams,
}: {
  params: Promise<{ postId: string }>;
  searchParams?: Promise<{ saved?: string }>;
}) {
  const session = await requireAdminSession();
  if (!session) {
    return null;
  }

  const { postId } = await params;
  const [post, categories, allSeries, allTags, resolvedSearchParams] = await Promise.all([
    getAdminEditablePostById(postId),
    listAdminCategories(),
    listAllSeries(),
    listAllAdminTags(),
    searchParams,
  ]);

  if (!post) {
    notFound();
  }

  return (
    <main className="min-h-screen px-4 pb-12 pt-24 sm:px-6 lg:px-8" style={{ background: "var(--background)" }}>
      <SiteHeader />
      <section className="container mx-auto mt-8 max-w-6xl sm:mt-10">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[var(--accent)]">Native editor</p>
            <h1 className="mt-2 text-3xl font-semibold text-[var(--foreground)] sm:text-4xl">Edit post</h1>
          </div>
          <div className="flex flex-wrap gap-3">
            <a className="rounded-full border border-[var(--border)] px-4 py-2 text-sm font-semibold text-[var(--foreground)]" href={`/posts/${post.slug}`}>
              Open public post
            </a>
            <Link className="rounded-full border border-[var(--border)] px-4 py-2 text-sm font-semibold text-[var(--foreground)]" href="/admin">
              Back to dashboard
            </Link>
          </div>
        </div>

        {resolvedSearchParams?.saved ? (
          <div className="mb-6 rounded-2xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
            Post saved successfully.
          </div>
        ) : null}

        <PostEditorForm
          action={updateAdminPostAction.bind(null, postId)}
          allSeries={allSeries}
          allTags={allTags}
          categories={categories}
          mode="edit"
          post={post}
        />
      </section>
    </main>
  );
}
