import { SiteHeader } from "@/components/layout/site-header";
import { PostCardSkeleton } from "@/components/blog/post-card-skeleton";

export default function AuthorLoading() {
  return (
    <main className="min-h-screen pb-20 pt-20 sm:pt-24" style={{ background: "var(--background)" }}>
      <SiteHeader />

      <div className="container mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        {/* Profile Card Skeleton */}
        <div className="mt-8 rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-6 shadow-xl sm:mt-10 sm:p-10 text-center animate-pulse">
          {/* Avatar */}
          <div className="mx-auto h-24 w-24 rounded-full bg-[var(--accent-soft)] mb-4" />
          
          {/* Name & Title */}
          <div className="mx-auto h-8 w-48 rounded-lg bg-[var(--border)] mb-2" />
          <div className="mx-auto h-4 w-32 rounded bg-[var(--border)] mb-6" />
          
          {/* Bio lines */}
          <div className="mx-auto h-4 w-full max-w-md rounded bg-[var(--border)] mb-2" />
          <div className="mx-auto h-4 w-3/4 max-w-md rounded bg-[var(--border)] mb-2" />
          <div className="mx-auto h-4 w-5/6 max-w-md rounded bg-[var(--border)]" />
        </div>

        {/* Activity feed skeleton */}
        <div className="mt-12">
          <div className="h-6 w-40 rounded bg-[var(--border)] mb-6 animate-pulse" />
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <PostCardSkeleton key={i} />
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
