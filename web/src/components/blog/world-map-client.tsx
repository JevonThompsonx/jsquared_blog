"use client";

import nextDynamic from "next/dynamic";
import type { ComponentProps } from "react";

import { WorldMap as WorldMapType } from "@/components/blog/world-map";

type WorldMapProps = ComponentProps<typeof WorldMapType>;

// MapLibre (~700KB) is code-split off the public route's initial JS.
// This wrapper lives in a Client Component because `next/dynamic` with
// `ssr: false` is illegal in a Server Component (Turbopack error).
const WorldMap = nextDynamic(
  () => import("@/components/blog/world-map").then((mod) => mod.WorldMap),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[560px] items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] text-sm text-[var(--text-secondary)]">
        Loading map…
      </div>
    ),
  },
);

export function WorldMapClient(props: WorldMapProps) {
  return <WorldMap {...props} />;
}
