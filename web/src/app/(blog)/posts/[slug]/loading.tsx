import { SiteHeader } from "@/components/layout/site-header";

export default function PostLoading() {
  return (
    <main id="main-content" className="min-h-screen" style={{ background: "var(--background)" }}>
      <SiteHeader />
      
      {/* Hero Image Skeleton */}
      <div className="w-full aspect-[5/3] max-h-[70vh] bg-[var(--accent-soft)] animate-pulse" />
      
      <article className="container mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
        <header className="mb-12 text-center animate-pulse">
          {/* Title block */}
          <div className="mx-auto h-8 sm:h-10 w-3/4 rounded-lg bg-[var(--border)] mb-4" />
          <div className="mx-auto h-8 sm:h-10 w-2/3 rounded-lg bg-[var(--border)] mb-6" />
          
          {/* Meta row */}
          <div className="flex items-center justify-center gap-4">
            <div className="h-6 w-24 rounded-full bg-[var(--border)]" />
            <div className="h-4 w-32 rounded bg-[var(--border)]" />
          </div>
        </header>

        {/* Prose body */}
        <div className="space-y-6 max-w-[65ch] mx-auto animate-pulse">
          <div className="h-4 w-full rounded bg-[var(--border)]" />
          <div className="h-4 w-11/12 rounded bg-[var(--border)]" />
          <div className="h-4 w-full rounded bg-[var(--border)]" />
          <div className="h-4 w-4/5 rounded bg-[var(--border)]" />
          <div className="h-4 w-full rounded bg-[var(--border)]" />
          <div className="h-4 w-9/10 rounded bg-[var(--border)]" />
          <div className="h-4 w-full rounded bg-[var(--border)]" />
          <div className="h-4 w-3/4 rounded bg-[var(--border)]" />
          <div className="h-4 w-11/12 rounded bg-[var(--border)]" />
          <div className="h-4 w-full rounded bg-[var(--border)]" />
        </div>
      </article>
    </main>
  );
}
