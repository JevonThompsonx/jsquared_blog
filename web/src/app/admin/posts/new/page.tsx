import Link from "next/link";

import { PostEditorForm } from "@/components/admin/post-editor-form";
import { SiteHeader } from "@/components/layout/site-header";
import { requireAdminSession } from "@/lib/auth/session";
import { listAdminCategories } from "@/server/dal/admin-posts";

import { createAdminPostAction } from "../../actions";

export default async function NewAdminPostPage() {
  const session = await requireAdminSession();
  if (!session) {
    return null;
  }

  const categories = await listAdminCategories();

  return (
    <main className="min-h-screen px-4 pb-12 pt-24 sm:px-6 lg:px-8" style={{ background: "var(--background)" }}>
      <SiteHeader />
      <section className="container mx-auto mt-8 max-w-6xl sm:mt-10">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[var(--accent)]">Native editor</p>
            <h1 className="mt-2 text-3xl font-semibold text-[var(--foreground)] sm:text-4xl">Create post</h1>
          </div>
          <Link className="rounded-full border border-[var(--border)] px-4 py-2 text-sm font-semibold text-[var(--foreground)]" href="/admin">
            Back to dashboard
          </Link>
        </div>
        <PostEditorForm action={createAdminPostAction} categories={categories} mode="create" />
      </section>
    </main>
  );
}
