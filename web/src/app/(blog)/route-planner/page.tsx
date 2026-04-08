import type { Metadata } from "next";

import { RoutePlannerForm } from "@/components/blog/route-planner-form";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Route Planner",
  description: "Plan a route between two places and explore public wishlist stops along the way.",
};

export default function RoutePlannerPage() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 py-10 sm:px-6">
      <section className="space-y-3">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--text-secondary)]">
          Travel tools
        </p>
        <h1 className="text-4xl font-semibold tracking-tight text-[var(--text-primary)]">
          Plan a route between two places
        </h1>
        <p className="max-w-3xl text-base text-[var(--text-secondary)]">
          Start with two real places, then let the app suggest public wishlist stops that fit the journey.
          Visited places stay excluded by default so the route planner highlights new possibilities first.
        </p>
      </section>

      <RoutePlannerForm />
    </main>
  );
}
