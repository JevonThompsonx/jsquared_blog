import withBundleAnalyzer from "@next/bundle-analyzer";
import { withSentryConfig } from "@sentry/nextjs";
import type { NextConfig } from "next";

const isProduction = process.env.NODE_ENV === "production";
const bundleAnalyzer = withBundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

// 6.S.1: CSP is now set dynamically per-request by proxy.ts (with a per-request nonce).
// next.config.ts only sets the remaining non-CSP security headers.
// 6.S.2: the explicit img-src / connect-src allowlists live in proxy.ts alongside the nonce logic.
const securityHeaders = [
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "X-Frame-Options",
    value: "DENY",
  },
  {
    key: "Permissions-Policy",
    value:
      "accelerometer=(), autoplay=(), camera=(), display-capture=(), geolocation=(), gyroscope=(), microphone=(), payment=(), usb=()",
  },
  {
    key: "Cross-Origin-Opener-Policy",
    value: "same-origin-allow-popups",
  },
  {
    key: "Cross-Origin-Resource-Policy",
    value: "same-site",
  },
  {
    key: "Origin-Agent-Cluster",
    value: "?1",
  },
  {
    key: "X-DNS-Prefetch-Control",
    value: "off",
  },
  {
    key: "X-Permitted-Cross-Domain-Policies",
    value: "none",
  },
  {
    key: "X-XSS-Protection",
    value: "0",
  },
  ...(isProduction
    ? [
        {
          key: "Strict-Transport-Security",
          value: "max-age=63072000; includeSubDomains; preload",
        },
      ]
    : []),
];

const nextConfig: NextConfig = {
  typedRoutes: true,
  poweredByHeader: false,
  allowedDevOrigins: ["debai", "192.168.3.43", "127.0.0.1"],
  ...(process.env.NEXT_OUTPUT === "standalone"
    ? { output: "standalone" as const }
    : {}),
  outputFileTracingIncludes: {
    // AuthKit is imported by the proxy and callback/server-auth modules. Trace
    // both SDKs explicitly so the standalone packager can link them at runtime.
    // drizzle-orm is bundled for the app but must remain a real package for the
    // migration/verify scripts shipped in the release.
    "/*": [
      "node_modules/@workos-inc/authkit-nextjs/**/*",
      "node_modules/@workos-inc/node/**/*",
      "node_modules/drizzle-orm/**/*",
    ],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
  images: {
    // Images are self-hosted. Only remote avatars remain possible.
    remotePatterns: [
      {
        protocol: "https",
        hostname: "avatars.githubusercontent.com",
      },
    ],
  },
};

export default bundleAnalyzer(
  withSentryConfig(nextConfig, {
    org: "jsquared-vf",
    project: "jsquaredblog",

    // Upload source maps to Sentry for readable stack traces in production.
    // Set SENTRY_AUTH_TOKEN in Vercel environment variables (do not commit).
    authToken: process.env.SENTRY_AUTH_TOKEN,

    // Upload a wider set of client files for better stack trace resolution
    widenClientFileUpload: true,

    // Proxy Sentry requests through a first-party path to reduce ad-blocker noise
    tunnelRoute: "/_err",

    // Suppress non-CI source map upload logs
    silent: !process.env.CI,

    webpack: {
      // Tree-shake Sentry debug logging from webpack bundles.
      treeshake: {
        removeDebugLogging: true,
      },
      // Automatically instrument supported server functions in webpack builds.
      autoInstrumentServerFunctions: true,
    },
  }),
);
