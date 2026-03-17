export default function AdminCommentsLoading() {
  return (
    <section className="container mx-auto mt-8 max-w-[min(92rem,calc(100vw-2rem))] sm:mt-10">
      <div className="animate-pulse space-y-6">
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card-bg)] px-5 py-4">
          <div className="h-4 w-32 rounded-full bg-[var(--accent-soft)]" />
          <div className="mt-3 h-8 w-64 rounded-full bg-[var(--surface-strong)]" />
        </div>

        <div className="rounded-xl border border-[var(--border)] bg-[var(--card-bg)] px-5 py-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="h-4 w-28 rounded-full bg-[var(--surface-strong)]" />
            <div className="flex gap-2">
              <div className="h-9 w-20 rounded-full bg-[var(--surface-strong)]" />
              <div className="h-9 w-20 rounded-full bg-[var(--surface-strong)]" />
              <div className="h-9 w-20 rounded-full bg-[var(--surface-strong)]" />
            </div>
          </div>
        </div>

        {[0, 1, 2].map((item) => (
          <div key={item} className="rounded-xl border border-[var(--border)] bg-[var(--card-bg)] p-5">
            <div className="flex flex-wrap items-center gap-3">
              <div className="h-4 w-28 rounded-full bg-[var(--surface-strong)]" />
              <div className="h-4 w-20 rounded-full bg-[var(--surface-strong)]" />
              <div className="h-5 w-16 rounded-full bg-[var(--surface-strong)]" />
            </div>
            <div className="mt-4 space-y-2">
              <div className="h-4 w-full rounded-full bg-[var(--surface-strong)]" />
              <div className="h-4 w-[88%] rounded-full bg-[var(--surface-strong)]" />
              <div className="h-4 w-[70%] rounded-full bg-[var(--surface-strong)]" />
            </div>
            <div className="mt-5 flex flex-wrap gap-2 border-t border-[var(--border)] pt-4">
              <div className="h-8 w-20 rounded-full bg-[var(--surface-strong)]" />
              <div className="h-8 w-20 rounded-full bg-[var(--surface-strong)]" />
              <div className="h-8 w-20 rounded-full bg-[var(--surface-strong)]" />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
