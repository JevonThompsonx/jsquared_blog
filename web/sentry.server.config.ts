import * as Sentry from "@sentry/nextjs";

// Route-aware sampler — sample key read/write paths at higher rate so slow DB
// queries and upstream latency regressions surface in the dashboard.
type SamplingContext = Parameters<
  NonNullable<Parameters<typeof Sentry.init>[0]["tracesSampler"]>
>[0];

function tracesSampler(context: SamplingContext): number {
  const name = context.name ?? "";
  if (name.includes("/api/posts") || name.includes("/posts/")) return 0.3;
  if (name.includes("/api/comments") || name.includes("/comments")) return 0.5;
  return 0.05;
}

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  tracesSampler,

  // SEC-1: do NOT send default PII (client IP / request headers / cookies) to
  // Sentry. Stack traces + route names still ship; scrubbing request metadata
  // keeps us out of GDPR/SOC-2 scope for request data. Identity, where needed,
  // is attached explicitly + minimally via Sentry.setUser from a session context.
  sendDefaultPii: false,

  // Attach local variable values to stack frames for richer server-side traces
  includeLocalVariables: true,

  // Structured logs forwarded to Sentry's Logs product
  enableLogs: true,

  // Disable client reports (SDK telemetry about dropped events)
  sendClientReports: false,

  debug: false,
  enabled: process.env.NODE_ENV === "production",
});
