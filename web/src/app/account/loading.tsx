export default function AccountLoading() {
  return (
    <div className="container mx-auto max-w-2xl px-4 sm:px-6 lg:px-8">
      <div className="mt-8 sm:mt-10 animate-pulse">
        <div className="mb-2 h-10 w-48 rounded-lg bg-[var(--border)]" />
        <div className="h-4 w-64 rounded bg-[var(--border)]" />
      </div>

      <div className="mt-8 animate-pulse space-y-8 rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-6 shadow-xl sm:p-10">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <div className="h-4 w-32 rounded bg-[var(--border)]" />
            <div className="h-10 w-full rounded-md bg-[var(--accent-soft)]" />
          </div>
        ))}

        <div className="flex justify-end pt-4">
          <div className="h-10 w-32 rounded-full bg-[var(--border)]" />
        </div>
      </div>
    </div>
  );
}
