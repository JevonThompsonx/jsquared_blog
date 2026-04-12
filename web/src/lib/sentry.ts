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


