import * as Sentry from "@sentry/nextjs";

// 6.O.2: Route-aware sampler — sample key read/write paths at higher rate
// so slow DB queries and upstream latency regressions surface in the dashboard.
// Type is inferred from the SDK's own init options rather than a named export.
type SamplingContext = Parameters<
  NonNullable<Parameters<typeof Sentry.init>[0]["tracesSampler"]>
>[0];

function tracesSampler(context: SamplingContext): number {
  const name = context.name ?? "";
  // Post read path — most traffic, most DB load
  if (name.includes("/api/posts") || name.includes("/posts/")) return 0.3;
  // Comment write/read path
  if (name.includes("/api/comments") || name.includes("/comments")) return 0.5;
  // All other routes
  return 0.05;
}

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampler,
  debug: false,
  enabled: process.env.NODE_ENV === "production",
});
