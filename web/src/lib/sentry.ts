import * as Sentry from "@sentry/nextjs";

/**
 * Capture an exception and send it to Sentry.
 * Safe to call in any context (server, client, edge).
 * No-ops when the SDK is disabled (configured via `enabled` in sentry.*.config.ts).
 */
export function captureException(err: unknown, context?: Record<string, unknown>): void {
  Sentry.withScope((scope) => {
    if (context) {
      scope.setExtras(context);
    }
    Sentry.captureException(err);
  });
}

/**
 * Record a breadcrumb in the current Sentry scope. Use this to attach
 * structured operational data (cron run metrics, queue depth, etc.) so
 * the next error captured in the same scope has the surrounding context.
 *
 * Safe to call in any context (server, client, edge). No-ops when the
 * SDK is disabled.
 */
export function addBreadcrumb(
  message: string,
  data?: Record<string, unknown>,
  category?: string,
): void {
  Sentry.addBreadcrumb({
    message,
    category: category ?? "app",
    level: "info",
    data,
  });
}


