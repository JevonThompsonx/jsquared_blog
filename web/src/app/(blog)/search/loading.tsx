import { PostCardSkeleton } from "@/components/blog/post-card-skeleton";

export default function SearchLoading() {
  return (
    <main id="main-content" style={{ background: "var(--background)" }}>
      <div className="border-b border-[var(--border)]" style={{ background: "var(--card-bg)" }}>
        <div className="container mx-auto max-w-5xl px-4 pb-10 pt-28 sm:px-6 sm:pb-14 lg:px-8">
          <div className="animate-pulse space-y-4">
            <div className="h-4 w-20 rounded-full bg-[var(--accent-soft)]" />
            <div className="h-10 w-64 rounded-lg bg-[var(--accent-soft)]" />
            <div className="h-4 w-96 max-w-full rounded-full bg-[var(--accent-soft)]" />
            <div className="mt-6 h-12 w-full max-w-2xl rounded-2xl bg-[var(--accent-soft)]" />
          </div>
        </div>
      </div>

      <div className="container mx-auto grid grid-cols-1 gap-8 p-4 auto-rows-[minmax(300px,auto)] sm:grid-cols-2 sm:p-6 md:grid-cols-2 lg:grid-cols-3 lg:p-8 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <PostCardSkeleton key={i} wide={i === 0} />
        ))}
      </div>
    </main>
  );
}
