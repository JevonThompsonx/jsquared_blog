import * as Sentry from "@sentry/nextjs";

import { closeProductionInspectorIfNeeded } from "@/lib/runtime/close-production-inspector";

export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    if (process.env.NODE_ENV === "production") {
      const inspector = await import("node:inspector");
      closeProductionInspectorIfNeeded({ inspector });
    }

    await import("../sentry.server.config");
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    await import("../sentry.edge.config");
  }
}

// Automatically captures all unhandled server-side request errors.
// Requires @sentry/nextjs >= 8.28.0
export const onRequestError = Sentry.captureRequestError;
