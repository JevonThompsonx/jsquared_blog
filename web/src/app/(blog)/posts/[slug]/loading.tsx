import { SiteHeader } from "@/components/layout/site-header";

export default function PostLoading() {
  return (
    <main id="main-content" className="min-h-screen pb-16 pt-20 sm:pt-24" style={{ background: "var(--background)" }}>
      <SiteHeader />

      <div className="container mx-auto mt-4 max-w-4xl px-4 sm:mt-6 sm:px-6 lg:px-8">
        {/* Breadcrumb skeleton */}
        <div className="mb-4 flex items-center gap-1.5 animate-pulse">
          <div className="h-4 w-12 rounded bg-[var(--border)]" />
          <span className="text-[var(--border)]">/</span>
          <div className="h-4 w-20 rounded bg-[var(--border)]" />
          <span className="text-[var(--border)]">/</span>
          <div className="h-4 w-32 rounded bg-[var(--border)]" />
        </div>

        {/* Article card skeleton */}
        <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] shadow-2xl">
          {/* Hero image skeleton */}
          <div className="aspect-[5/3] w-full bg-[var(--accent-soft)] animate-pulse" />

          {/* Header skeleton */}
          <div className="px-5 pb-6 pt-7 sm:px-10 sm:pt-9 animate-pulse">
            <div className="flex items-center gap-3">
              <div className="h-4 w-20 rounded-full bg-[var(--border)]" />
              <div className="h-4 w-24 rounded bg-[var(--border)]" />
              <div className="h-4 w-16 rounded bg-[var(--border)]" />
            </div>
            <div className="mt-4 h-9 w-3/4 rounded-lg bg-[var(--border)]" />
            <div className="mt-2 h-9 w-1/2 rounded-lg bg-[var(--border)]" />
            <div className="mt-5 flex gap-2">
              <div className="h-7 w-16 rounded-full bg-[var(--border)]" />
              <div className="h-7 w-20 rounded-full bg-[var(--border)]" />
              <div className="h-7 w-14 rounded-full bg-[var(--border)]" />
            </div>
          </div>

          {/* Divider */}
          <div className="mx-5 h-px bg-gradient-to-r from-transparent via-[var(--border)] to-transparent sm:mx-10" />

          {/* Prose skeleton */}
          <div className="px-5 py-9 sm:px-10">
            <div className="mx-auto max-w-[68ch] space-y-4 animate-pulse">
              <div className="h-4 w-full rounded bg-[var(--border)]" />
              <div className="h-4 w-11/12 rounded bg-[var(--border)]" />
              <div className="h-4 w-full rounded bg-[var(--border)]" />
              <div className="h-4 w-4/5 rounded bg-[var(--border)]" />
              <div className="h-4 w-full rounded bg-[var(--border)]" />
              <div className="h-4 w-9/12 rounded bg-[var(--border)]" />
              <div className="h-4 w-full rounded bg-[var(--border)]" />
              <div className="h-4 w-3/4 rounded bg-[var(--border)]" />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
