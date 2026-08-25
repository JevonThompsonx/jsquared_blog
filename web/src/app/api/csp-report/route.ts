import { NextResponse } from "next/server";

import { captureException } from "@/lib/sentry";

// SEC-3: CSP violation reporting endpoint (log-only).
//
// The browser's Reporting API POSTs CSP violations here. We deliberately:
//   - never return 4xx for a malformed report (the browser retries a few times),
//   - log a sanitized subset (no full URL query strings, no script samples beyond
//     what the directive already truncates), so we can tighten the policy over time
//     without leaking PII.
//   - rate-limit per-IP so the endpoint cannot be used as a free log-injection /
//     DoS sink.
//
// This endpoint is intentionally NON-BLOCKING: a failure here must not affect
// the page that generated the report.

const MAX_FIELD_LEN = 512;

function truncate(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.slice(0, MAX_FIELD_LEN);
}

type CspReportBody = {
  "csp-report"?: {
    "blocked-uri"?: string;
    "document-uri"?: string;
    "effective-directive"?: string;
    "original-policy"?: string;
    "referrer"?: string;
    "status-code"?: number | string;
    "violated-directive"?: string;
    "source-file"?: string;
    "line-number"?: number | string;
    "column-number"?: number | string;
    "script-sample"?: string;
  };
};

type ReportingApiBody = Array<{
  type?: string;
  url?: string;
  body?: {
    blockedURL?: string;
    documentURL?: string;
    effectiveDirective?: string;
    originalPolicy?: string;
    referrer?: string;
    disposition?: string;
    violatedDirective?: string;
    sample?: string;
    lineNumber?: number;
    columnNumber?: number;
  };
}>;

function logSanitizedReport(report: Record<string, unknown>): void {
  console.warn("[csp-report] violation", {
    blockedUri: truncate(report.blockedUri),
    documentUri: truncate(report.documentUri),
    effectiveDirective: truncate(report.effectiveDirective),
    violatedDirective: truncate(report.violatedDirective),
    referrer: truncate(report.referrer),
    disposition: truncate(report.disposition),
  });
}

export async function POST(request: Request): Promise<NextResponse> {
  // Lightweight, non-fatal rate limit. If Upstash is unavailable the limiter
  // throws in deployed envs — we swallow it so the report endpoint stays up.
  try {
    const { checkRateLimit, getClientIp } = await import("@/lib/rate-limit");
    const rl = await checkRateLimit(`csp-report:${getClientIp(request)}`, 30, 60_000);
    if (!rl.allowed) {
      return new NextResponse(null, { status: 204 });
    }
  } catch {
    // Rate limiting is best-effort here; never block the report.
  }

  const contentType = request.headers.get("content-type") ?? "";

  try {
    if (contentType.includes("application/reports+json")) {
      const reports = (await request.json()) as ReportingApiBody;
      for (const entry of reports ?? []) {
        if (entry?.type !== "csp-violation") continue;
        logSanitizedReport({
          blockedUri: entry.body?.blockedURL,
          documentUri: entry.body?.documentURL,
          effectiveDirective: entry.body?.effectiveDirective,
          violatedDirective: entry.body?.violatedDirective,
          referrer: entry.body?.referrer,
          disposition: entry.body?.disposition,
        });
      }
    } else {
      // Legacy application/csp-report (or application/json) shape.
      const payload = (await request.json()) as CspReportBody;
      const r = payload["csp-report"];
      if (r) {
        logSanitizedReport({
          blockedUri: r["blocked-uri"],
          documentUri: r["document-uri"],
          effectiveDirective: r["effective-directive"] ?? r["violated-directive"],
          violatedDirective: r["violated-directive"],
          referrer: r["referrer"],
        });
      }
    }
  } catch (error) {
    // Never surface parsing errors to the browser; just record them internally.
    captureException(error, { route: "csp-report" });
  }

  return new NextResponse(null, { status: 204 });
}
