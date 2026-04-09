import Link from "next/link";
import { redirect } from "next/navigation";

import { PostEditorForm } from "@/components/admin/post-editor-form";
import { SiteHeader } from "@/components/layout/site-header";
import { requireAdminSession } from "@/lib/auth/session";
import { listAdminCategories, listAllAdminTags } from "@/server/dal/admin-posts";
import { listAllSeries } from "@/server/dal/series";

import { createAdminPostAction } from "../../actions";

export default async function NewAdminPostPage() {
  const session = await requireAdminSession();
  if (session?.user?.role !== "admin") {
    redirect("/admin");
  }

  const [categories, allSeries, allTags] = await Promise.all([listAdminCategories(), listAllSeries(), listAllAdminTags()]);

  return (
    <main id="main-content" className="min-h-screen px-4 pb-12 pt-24 sm:px-6 lg:px-8" style={{ background: "var(--background)" }}>
      <SiteHeader />
      <section className="container mx-auto mt-8 max-w-[min(92rem,calc(100vw-2rem))] sm:mt-10">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[var(--accent)]">Native editor</p>
            <h1 className="mt-2 text-3xl font-semibold text-[var(--foreground)] sm:text-4xl">Create post</h1>
          </div>
          <Link className="rounded-full border border-[var(--border)] px-4 py-2 text-sm font-semibold text-[var(--foreground)]" href="/admin">
            Back to dashboard
          </Link>
        </div>
        <PostEditorForm action={createAdminPostAction} allSeries={allSeries} allTags={allTags} categories={categories} mode="create" />
      </section>
    </main>
  );
}
