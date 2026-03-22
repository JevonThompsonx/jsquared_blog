import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Capture user context (IP, request headers) in error reports
  sendDefaultPii: true,

  // 100% in dev so every trace shows up; 10% in production to stay within quota
  tracesSampleRate: process.env.NODE_ENV === "development" ? 1.0 : 0.1,

  // Session Replay: record 10% of all sessions, 100% of sessions that hit an error
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,

  // Structured logs forwarded to Sentry's Logs product
  enableLogs: true,

  integrations: [
    Sentry.replayIntegration(),
  ],

  debug: false,
  enabled: process.env.NODE_ENV === "production",
});

// Hook into App Router navigation transitions so client-side navigations
// appear as spans in Sentry traces
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
