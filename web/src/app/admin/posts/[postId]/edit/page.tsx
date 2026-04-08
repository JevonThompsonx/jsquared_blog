import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";

import { PostEditorForm } from "@/components/admin/post-editor-form";
import { SiteHeader } from "@/components/layout/site-header";
import { requireAdminSession } from "@/lib/auth/session";
import { getAdminEditablePostById, listAdminCategories, listAllAdminTags } from "@/server/dal/admin-posts";
import { listAllSeries } from "@/server/dal/series";
import { getPostHref } from "@/lib/utils";

import { updateAdminPostAction } from "../../../actions";

const editPostParamsSchema = z.object({
  postId: z.string().trim().min(1).max(128),
});

export default async function EditAdminPostPage({
  params,
  searchParams,
}: {
  params: Promise<{ postId: string }>;
  searchParams?: Promise<{ saved?: string; cloned?: string }>;
}) {
  const session = await requireAdminSession();
  if (!session) {
    redirect("/admin");
  }

  const parsedParams = editPostParamsSchema.safeParse(await params);
  if (!parsedParams.success) {
    notFound();
  }

  const { postId } = parsedParams.data;
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
    <main id="main-content" className="min-h-screen px-4 pb-12 pt-24 sm:px-6 lg:px-8" style={{ background: "var(--background)" }}>
      <SiteHeader />
      <section className="container mx-auto mt-8 max-w-[min(92rem,calc(100vw-2rem))] sm:mt-10">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[var(--accent)]">Native editor</p>
            <h1 className="mt-2 text-3xl font-semibold text-[var(--foreground)] sm:text-4xl">Edit post</h1>
          </div>
          <div className="flex flex-wrap gap-3">
            {post.status === "published" ? (
              <Link className="rounded-full border border-[var(--border)] px-4 py-2 text-sm font-semibold text-[var(--foreground)] transition-colors hover:bg-[var(--accent-soft)] hover:text-[var(--accent)]" href={getPostHref({ id: post.id, title: post.title, slug: post.slug })}>
                View live
              </Link>
            ) : null}
            <Link className="rounded-full border border-[var(--border)] px-4 py-2 text-sm font-semibold text-[var(--foreground)] transition-colors hover:bg-[var(--accent-soft)] hover:text-[var(--accent)]" href="/admin">
              Back to dashboard
            </Link>
          </div>
        </div>

        {resolvedSearchParams?.saved ? (
          <div className="mb-6 rounded-2xl border border-[var(--color-success-soft-border)] bg-[var(--color-success-soft-bg)] px-4 py-3 text-sm text-[var(--color-success-text)]">
            Post saved successfully.
          </div>
        ) : null}

        {resolvedSearchParams?.cloned ? (
          <div className="mb-6 rounded-2xl border border-[var(--color-success-soft-border)] bg-[var(--color-success-soft-bg)] px-4 py-3 text-sm text-[var(--color-success-text)]">
            Draft clone created successfully.
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
