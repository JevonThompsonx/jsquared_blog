"use client";

import { useEffect } from "react";

import { captureException } from "@/lib/sentry";

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
      <body>
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: "Georgia, serif",
            background: "#f4efe5",
            color: "#273126",
            padding: "2rem",
          }}
        >
          <div
            style={{
              maxWidth: "480px",
              textAlign: "center",
              border: "1px solid #d8d0c1",
              borderRadius: "1rem",
              padding: "2.5rem",
              background: "#fcf8f1",
            }}
          >
            <p style={{ fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", color: "#6f865b" }}>
              J²Adventures
            </p>
            <h1 style={{ marginTop: "1rem", fontSize: "1.5rem", fontWeight: 600 }}>Something went wrong</h1>
            <p style={{ marginTop: "0.75rem", fontSize: "0.875rem", color: "#5c6758", lineHeight: "1.6" }}>
              An unexpected error occurred. Please try again or return to the home page.
            </p>
            <div style={{ marginTop: "1.5rem", display: "flex", gap: "0.75rem", justifyContent: "center", flexWrap: "wrap" }}>
              <button
                onClick={reset}
                style={{
                  padding: "0.625rem 1.25rem",
                  borderRadius: "9999px",
                  background: "#6f865b",
                  color: "#ffffff",
                  border: "none",
                  cursor: "pointer",
                  fontSize: "0.875rem",
                  fontWeight: 600,
                }}
              >
                Try again
              </button>
              {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- global-error renders outside the Next.js app shell; Link is unavailable here */}
              <a
                href="/"
                style={{
                  padding: "0.625rem 1.25rem",
                  borderRadius: "9999px",
                  border: "1px solid #d8d0c1",
                  color: "#273126",
                  textDecoration: "none",
                  fontSize: "0.875rem",
                  fontWeight: 600,
                }}
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
