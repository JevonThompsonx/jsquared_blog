import { PostCardSkeleton } from "@/components/blog/post-card-skeleton";

export default function TagLoading() {
  return (
    <main id="main-content" style={{ background: "var(--background)" }}>
      {/* Header placeholder */}
      <div className="border-b border-[var(--border)] bg-[var(--card-bg)] px-4 py-10 sm:px-6 sm:py-14">
        <div className="mx-auto max-w-4xl animate-pulse space-y-3">
          <div className="h-3 w-16 rounded-full bg-[var(--border)]" />
          <div className="h-8 w-48 rounded-lg bg-[var(--border)]" />
          <div className="h-3 w-32 rounded-full bg-[var(--border)]" />
        </div>
      </div>

      {/* Post grid skeleton */}
      <div className="container mx-auto grid grid-cols-1 gap-8 p-4 auto-rows-[minmax(300px,auto)] sm:grid-cols-2 sm:p-6 md:grid-cols-2 lg:grid-cols-3 lg:p-8 xl:grid-cols-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <PostCardSkeleton key={i} wide={false} />
        ))}
      </div>
    </main>
  );
}
