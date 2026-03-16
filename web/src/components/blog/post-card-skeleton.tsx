export function PostCardSkeleton({ wide = false }: { wide?: boolean }) {
  const gridClass = wide ? "col-span-1 md:col-span-2 lg:col-span-2 xl:col-span-2" : "col-span-1";
  return (
    <div className={`${gridClass} animate-pulse`}>
      <div className="flex h-full flex-col overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--card-bg)] shadow-lg">
        <div className="h-56 bg-[var(--accent-soft)] sm:h-60" />
        <div className="flex flex-grow flex-col gap-3 p-4 md:p-6">
          <div className="h-3 w-16 rounded-full bg-[var(--accent-soft)]" />
          <div className="h-5 w-3/4 rounded bg-[var(--accent-soft)]" />
          <div className="h-5 w-1/2 rounded bg-[var(--accent-soft)]" />
          <div className="mt-auto h-3 w-20 rounded-full bg-[var(--accent-soft)]" />
        </div>
      </div>
    </div>
  );
}
