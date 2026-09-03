import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  tracesSampleRate: process.env.NODE_ENV === "development" ? 1.0 : 0.1,

  // SEC-1: do NOT send default PII (client IP / request headers) to Sentry.
  sendDefaultPii: false,
  enableLogs: true,

  // Disable client reports (SDK telemetry about dropped events)
  sendClientReports: false,

  debug: false,
  enabled: process.env.NODE_ENV === "production",
});
