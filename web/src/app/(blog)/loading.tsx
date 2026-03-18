import { PostCardSkeleton } from "@/components/blog/post-card-skeleton";

export default function BlogLoading() {
  return (
    <main id="main-content" style={{ background: "var(--background)" }}>
      {/* Minimal hero placeholder — same height as real hero */}
      <div className="relative flex min-h-[70svh] items-center justify-center bg-[var(--accent-soft)]">
        <div className="animate-pulse space-y-4 text-center">
          <div className="mx-auto h-4 w-24 rounded-full bg-[var(--border)]" />
          <div className="mx-auto h-10 w-56 rounded-lg bg-[var(--border)]" />
          <div className="mx-auto h-4 w-40 rounded-full bg-[var(--border)]" />
        </div>
      </div>

      {/* Feed skeleton */}
      <div className="container mx-auto grid grid-cols-1 gap-8 p-4 auto-rows-[minmax(300px,auto)] sm:grid-cols-2 sm:p-6 md:grid-cols-2 lg:grid-cols-3 lg:p-8 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <PostCardSkeleton key={i} wide={i === 0} />
        ))}
      </div>
    </main>
  );
}
