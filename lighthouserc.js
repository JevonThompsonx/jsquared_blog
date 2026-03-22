// Lighthouse CI configuration
// Runs against the Vercel preview URL on each deployment.
// Assertions use the lighthouse:no-pwa preset as the base, then override
// only the audits we care about or need to relax for a Next.js app.

/** @type {import('@lhci/cli').LighthouseRcFile} */
module.exports = {
  ci: {
    collect: {
      // URLs are injected by the GitHub Actions workflow via --collect.url flags.
      // numberOfRuns is set here as the default; the workflow may override it.
      numberOfRuns: 3,
      settings: {
        // Preset: desktop emulation gives stable, repeatable results in CI.
        preset: "desktop",
      },
    },
    assert: {
      // Start from the no-pwa preset (drops PWA-specific audit failures).
      // Then override individual audits below.
      preset: "lighthouse:no-pwa",
      assertions: {
        // ── Category score floors ──────────────────────────────────────────
        "categories:performance": ["error", { minScore: 0.9 }],
        "categories:accessibility": ["error", { minScore: 0.95 }],
        "categories:best-practices": ["warn", { minScore: 0.9 }],
        "categories:seo": ["warn", { minScore: 0.9 }],

        // ── Performance: relax audits that are noisy on Next.js apps ───────
        // Code-splitting produces multiple chunks; unused coverage is expected.
        "unused-javascript": "off",
        "unused-css-rules": "off",
        // Render-blocking: Next.js injects a single CSS chunk; warn only.
        "render-blocking-resources": ["warn", { maxLength: 1 }],
        // Cache TTL: Vercel controls cache headers on _next/static; not actionable.
        "uses-long-cache-ttl": "off",
        // These audits return NaN on some Lighthouse versions — skip minScore checks.
        "bootup-time": "off",
        "mainthread-work-breakdown": "off",
        "third-party-facades": "off",
        // New insight audits (Lighthouse 13) — warn only until baselines are set.
        "document-latency-insight": ["warn", { minScore: 0 }],
        "legacy-javascript-insight": ["warn", { minScore: 0 }],
        "render-blocking-insight": "off",

        // ── Core Web Vitals ────────────────────────────────────────────────
        "largest-contentful-paint": ["warn", { maxNumericValue: 4000 }],
        "interactive": ["warn", { maxNumericValue: 5000 }],
        "max-potential-fid": ["warn", { maxNumericValue: 300 }],

        // ── Accessibility ──────────────────────────────────────────────────
        "color-contrast": ["error", { minScore: 1 }],
        "meta-viewport": ["error", { minScore: 1 }],

        // ── SEO ────────────────────────────────────────────────────────────
        "meta-description": ["warn", { minScore: 1 }],

        // ── Best Practices ────────────────────────────────────────────────
        "errors-in-console": ["warn", { minScore: 1 }],

        // ── Not applicable for Next.js / Vercel ───────────────────────────
        "redirects": "off",
      },
    },
    upload: {
      target: "temporary-public-storage",
    },
  },
};
