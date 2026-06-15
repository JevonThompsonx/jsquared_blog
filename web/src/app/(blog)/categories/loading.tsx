export default function CategoriesLoading() {
  return (
    <main id="main-content" style={{ background: "var(--background)" }} tabIndex={-1}>
      {/* Header placeholder */}
      <div className="border-b border-[var(--border)] bg-[var(--card-bg)] px-4 py-10 sm:px-6 sm:py-14">
        <div className="mx-auto max-w-5xl animate-pulse space-y-3">
          <div className="h-3 w-24 rounded-full bg-[var(--border)]" />
          <div className="h-8 w-72 rounded-lg bg-[var(--border)]" />
          <div className="h-3 w-96 max-w-full rounded-full bg-[var(--border)]" />
        </div>
      </div>

      {/* Category grid skeleton */}
      <section aria-label="Loading categories" className="container mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <li key={i}>
              <div className="flex h-full flex-col gap-3 rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-5 shadow-[var(--shadow)]">
                <div className="flex animate-pulse items-start gap-3">
                  <div className="h-10 w-10 shrink-0 rounded-xl bg-[var(--border)]" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 w-24 rounded-full bg-[var(--border)]" />
                    <div className="h-2.5 w-16 rounded-full bg-[var(--border)]" />
                  </div>
                </div>
                <div className="space-y-2 animate-pulse">
                  <div className="h-2.5 w-full rounded-full bg-[var(--border)]" />
                  <div className="h-2.5 w-3/4 rounded-full bg-[var(--border)]" />
                </div>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
