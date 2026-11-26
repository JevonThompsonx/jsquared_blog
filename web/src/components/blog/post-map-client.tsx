"use client";

import nextDynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";

import type { PostMapProps } from "@/components/blog/post-map";

// MapLibre (~700KB) plus its CSS is code-split off the post page's initial JS.
// This wrapper lives in a Client Component because `next/dynamic` with
// `ssr: false` is illegal in a Server Component (Turbopack error), mirroring
// world-map-client.tsx on the /map route.
const PostMap = nextDynamic(
  () => import("@/components/blog/post-map").then((mod) => mod.PostMap),
  {
    ssr: false,
    loading: () => <PostMapPlaceholder />,
  },
);

// Matches the mounted map's footprint (header bar + 320px canvas) so deferring
// the chunk does not shift the article below it.
function PostMapPlaceholder() {
  return (
    <div className="world-map-container overflow-hidden rounded-xl border border-[var(--border)] shadow-md">
      <div className="flex h-[361px] items-center justify-center bg-[var(--background)]">
        <p className="text-sm text-[var(--text-secondary)]">Loading map…</p>
      </div>
    </div>
  );
}

export function PostMapClient(props: PostMapProps) {
  const [shouldRender, setShouldRender] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Defer the dynamic chunk until the map is within 400px of the viewport.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShouldRender(true);
          observer.disconnect();
        }
      },
      { rootMargin: "400px" },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  if (shouldRender) {
    return <PostMap {...props} />;
  }

  return (
    <div ref={containerRef}>
      <PostMapPlaceholder />
    </div>
  );
}
