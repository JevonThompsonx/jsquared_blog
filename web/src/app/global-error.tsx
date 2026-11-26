"use client";

import { useEffect, useState } from "react";

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

function usePrefersDarkMode(): boolean {
  const [prefersDark, setPrefersDark] = useState(false);

  useEffect(() => {
    if (typeof window.matchMedia !== "function") return;

    const query = window.matchMedia("(prefers-color-scheme: dark)");
    const update = () => setPrefersDark(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  return prefersDark;
}

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const prefersDark = usePrefersDarkMode();
  // No `<style>` element: global-error renders outside the app shell and the
  // CSP treats an inline stylesheet differently from inline style attributes.
  const theme = prefersDark ? darkStyles : lightStyles;

  useEffect(() => {
    captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <head>
        <meta content="width=device-width, initial-scale=1" name="viewport" />
      </head>
      <body>
        <main
          id="main-content"
          style={mergeStyles(baseStyles.page, theme.page)}
          tabIndex={-1}
        >
          <div style={mergeStyles(baseStyles.card, theme.card)}>
            <p style={mergeStyles(baseStyles.brand, theme.brand)}>
              J²Adventures
            </p>
            <h1 style={baseStyles.heading}>Something went wrong</h1>
            <p style={mergeStyles(baseStyles.body, theme.body)}>
              An unexpected error occurred. Please try again or return to the
              home page.
            </p>
            <div style={baseStyles.actions}>
              <button
                onClick={reset}
                style={mergeStyles(
                  baseStyles.primaryButton,
                  theme.primaryButton,
                )}
              >
                Try again
              </button>
              {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- global-error renders outside the Next.js app shell; Link is unavailable here */}
              <a
                href="/"
                style={mergeStyles(
                  baseStyles.secondaryLink,
                  theme.secondaryLink,
                )}
              >
                Return home
              </a>
            </div>
          </div>
        </main>
      </body>
    </html>
  );
}
