"use client";

import { useEffect } from "react";

import { captureException } from "@/lib/sentry";

const baseStyles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: "Georgia, serif",
    padding: "2rem",
  },
  card: {
    maxWidth: "480px",
    textAlign: "center",
    borderRadius: "1rem",
    padding: "2.5rem",
  },
  brand: {
    fontSize: "0.75rem",
    fontWeight: 700,
    letterSpacing: "0.2em",
    textTransform: "uppercase",
  },
  heading: {
    marginTop: "1rem",
    fontSize: "1.5rem",
    fontWeight: 600,
  },
  body: {
    marginTop: "0.75rem",
    fontSize: "0.875rem",
    lineHeight: 1.6,
  },
  actions: {
    marginTop: "1.5rem",
    display: "flex",
    gap: "0.75rem",
    justifyContent: "center",
    flexWrap: "wrap",
  },
  primaryButton: {
    padding: "0.625rem 1.25rem",
    borderRadius: "9999px",
    border: "none",
    cursor: "pointer",
    fontSize: "0.875rem",
    fontWeight: 600,
  },
  secondaryLink: {
    padding: "0.625rem 1.25rem",
    borderRadius: "9999px",
    textDecoration: "none",
    fontSize: "0.875rem",
    fontWeight: 600,
  },
};

const lightStyles: Record<string, React.CSSProperties> = {
  page: { background: "#f4efe5", color: "#273126" },
  card: { border: "1px solid #d8d0c1", background: "#fcf8f1" },
  brand: { color: "#6f865b" },
  body: { color: "#5c6758" },
  primaryButton: { background: "#6f865b", color: "#ffffff" },
  secondaryLink: { border: "1px solid #d8d0c1", color: "#273126" },
};

const darkStyles: Record<string, React.CSSProperties> = {
  page: { background: "#111812", color: "#e2e8e0" },
  card: { border: "1px solid #2d382e", background: "#1a231b" },
  brand: { color: "#93a780" },
  body: { color: "#a0ac9c" },
  primaryButton: { background: "#93a780", color: "#111812" },
  secondaryLink: { border: "1px solid #2d382e", color: "#e2e8e0" },
};

function mergeStyles(
  base: React.CSSProperties,
  ...overrides: (React.CSSProperties | undefined)[]
): React.CSSProperties {
  return overrides.reduce<React.CSSProperties>(
    (acc, override) => (override ? { ...acc, ...override } : acc),
    base,
  );
}

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <head>
        <meta
          content="width=device-width, initial-scale=1"
          name="viewport"
        />
        <style>{`
          @media (prefers-color-scheme: dark) {
            .global-error-page { background: #111812 !important; color: #e2e8e0 !important; }
            .global-error-card { border-color: #2d382e !important; background: #1a231b !important; }
            .global-error-brand { color: #93a780 !important; }
            .global-error-body { color: #a0ac9c !important; }
            .global-error-primary { background: #93a780 !important; color: #111812 !important; }
            .global-error-secondary { border-color: #2d382e !important; color: #e2e8e0 !important; }
          }
        `}</style>
      </head>
      <body>
        <div className="global-error-page" style={mergeStyles(baseStyles.page, lightStyles.page)}>
          <div className="global-error-card" style={mergeStyles(baseStyles.card, lightStyles.card)}>
            <p className="global-error-brand" style={mergeStyles(baseStyles.brand, lightStyles.brand)}>
              J²Adventures
            </p>
            <h1 className="global-error-heading" style={baseStyles.heading}>Something went wrong</h1>
            <p className="global-error-body" style={mergeStyles(baseStyles.body, lightStyles.body)}>
              An unexpected error occurred. Please try again or return to the home page.
            </p>
            <div style={baseStyles.actions}>
              <button
                className="global-error-primary"
                onClick={reset}
                style={mergeStyles(baseStyles.primaryButton, lightStyles.primaryButton)}
              >
                Try again
              </button>
              {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- global-error renders outside the Next.js app shell; Link is unavailable here */}
              <a
                className="global-error-secondary"
                href="/"
                style={mergeStyles(baseStyles.secondaryLink, lightStyles.secondaryLink)}
              >
                Return home
              </a>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
