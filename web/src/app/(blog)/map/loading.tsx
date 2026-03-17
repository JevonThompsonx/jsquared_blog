import { SiteHeader } from "@/components/layout/site-header";

export default function MapLoading() {
  return (
    <main className="min-h-screen" style={{ background: "var(--background)" }}>
      <SiteHeader />
      
      <div className="container mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header placeholder */}
        <div className="mb-6 animate-pulse">
          <div className="h-8 w-48 rounded-lg bg-[var(--border)] mb-2" />
          <div className="h-4 w-96 rounded bg-[var(--border)] max-w-full" />
        </div>

        {/* Map canvas skeleton */}
        <div className="w-full aspect-video rounded-2xl bg-[var(--accent-soft)] animate-pulse shadow-lg mb-6" />

        {/* Pill filter skeletons */}
        <div className="flex flex-wrap gap-2 animate-pulse">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-10 w-24 rounded-full bg-[var(--border)]" />
          ))}
        </div>
      </div>
    </main>
  );
}
