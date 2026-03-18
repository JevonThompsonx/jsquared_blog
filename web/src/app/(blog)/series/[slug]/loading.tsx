import { SiteHeader } from "@/components/layout/site-header";

export default function SeriesLoading() {
  return (
    <main id="main-content" className="min-h-screen pb-20 pt-20 sm:pt-24" style={{ background: "var(--background)" }}>
      <SiteHeader />

      <div className="container mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mt-8 sm:mt-10 animate-pulse">
          <div className="h-4 w-24 rounded bg-[var(--border)] mb-4" />
          <div className="h-3 w-16 rounded bg-[var(--border)] mb-2" />
          <div className="h-10 w-64 rounded-lg bg-[var(--border)] mb-4" />
          <div className="h-4 w-full max-w-2xl rounded bg-[var(--border)] mb-2" />
          <div className="h-4 w-3/4 max-w-2xl rounded bg-[var(--border)] mb-4" />
          <div className="h-4 w-20 rounded bg-[var(--border)]" />
        </div>

        {/* Parts list */}
        <ol className="mt-8 space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <li key={i}>
              <div className="flex gap-5 overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] shadow-lg h-[152px]">
                {/* Part number badge */}
                <div className="flex w-16 shrink-0 flex-col items-center justify-center border-r border-[var(--border)] bg-[var(--accent-soft)] sm:w-20" />

                {/* Post info */}
                <div className="flex min-w-0 flex-1 flex-col justify-center gap-3 py-5 pr-5 animate-pulse">
                  <div className="h-6 w-3/4 rounded bg-[var(--border)]" />
                  <div className="space-y-2">
                    <div className="h-4 w-full rounded bg-[var(--border)]" />
                    <div className="h-4 w-5/6 rounded bg-[var(--border)]" />
                  </div>
                  <div className="h-3 w-24 rounded bg-[var(--border)] mt-1" />
                </div>

                {/* Thumbnail */}
                <div className="hidden h-full w-32 shrink-0 bg-[var(--accent-soft)] sm:block animate-pulse" />
              </div>
            </li>
          ))}
        </ol>
      </div>
    </main>
  );
}
