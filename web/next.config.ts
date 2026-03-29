import { withSentryConfig } from "@sentry/nextjs";
import type { NextConfig } from "next";

const isProduction = process.env.NODE_ENV === "production";

// 6.S.1: CSP is now set dynamically per-request by middleware.ts (with a per-request nonce).
// next.config.ts only sets the remaining non-CSP security headers.
// 6.S.2: the explicit img-src / connect-src allowlists live in middleware.ts alongside the nonce logic.
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
    value: "accelerometer=(), autoplay=(), camera=(), display-capture=(), geolocation=(), gyroscope=(), microphone=(), payment=(), usb=()",
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
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
      },
      {
        protocol: "https",
        hostname: "*.cloudinary.com",
      },
      {
        protocol: "https",
        hostname: "placehold.co",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "imagedelivery.net",
      },
      {
        protocol: "https",
        hostname: "*.supabase.co",
      },
      {
        protocol: "https",
        hostname: "avatars.githubusercontent.com",
      },
    ],
  },
};

export default withSentryConfig(nextConfig, {
  org: "jsquared-vf",
  project: "jsquaredblog",

  // Upload source maps to Sentry for readable stack traces in production.
  // Set SENTRY_AUTH_TOKEN in Vercel environment variables (do not commit).
  authToken: process.env.SENTRY_AUTH_TOKEN,

  // Upload a wider set of client files for better stack trace resolution
  widenClientFileUpload: true,

  // Proxy Sentry requests through /monitoring to bypass ad-blockers
  tunnelRoute: "/monitoring",

  // Suppress non-CI source map upload logs
  silent: !process.env.CI,

  // Tree-shake Sentry SDK for smaller client bundles (webpack only)
  disableLogger: true,

  // Automatically instrument Next.js data fetching methods
  autoInstrumentServerFunctions: true,
});
