import { withSentryConfig } from "@sentry/nextjs";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typedRoutes: true,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
};

export default withSentryConfig(nextConfig, {
  // Suppresses source map upload logs during build
  silent: !process.env.CI,
  // Upload source maps to Sentry for readable stack traces in production.
  // Requires SENTRY_AUTH_TOKEN env var (set in Vercel, not committed).
  authToken: process.env.SENTRY_AUTH_TOKEN,
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  // Tree-shake Sentry SDK for smaller client bundles
  disableLogger: true,
  // Automatically instrument Next.js data fetching methods
  autoInstrumentServerFunctions: true,
});
