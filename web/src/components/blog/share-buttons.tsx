"use client";

import { useEffect, useRef, useState } from "react";

function isAbortError(error: unknown): boolean {
  return (error instanceof DOMException || error instanceof Error) && error.name === "AbortError";
}

function ShareIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-4 w-4 shrink-0 transition-transform duration-200 group-hover:scale-110"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      viewBox="0 0 24 24"
    >
      <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" strokeLinecap="round" strokeLinejoin="round" />
      <polyline points="16 6 12 2 8 6" strokeLinecap="round" strokeLinejoin="round" />
      <line x1="12" x2="12" y1="2" y2="15" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-4 w-4 shrink-0 text-[var(--color-success)]"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      viewBox="0 0 24 24"
    >
      <polyline points="20 6 9 17 4 12" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ErrorIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-4 w-4 shrink-0 text-[var(--color-error)]"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      viewBox="0 0 24 24"
    >
      <path d="M12 8v5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="12" cy="16.5" r="0.75" fill="currentColor" stroke="none" />
      <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.72 3h16.92a2 2 0 0 0 1.72-3L13.71 3.86a2 2 0 0 0-3.42 0Z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function ShareButtons({ url, title }: { url: string; title: string }) {
  const [status, setStatus] = useState<"idle" | "shared" | "copied" | "error">("idle");
  const resetTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (resetTimerRef.current !== null) {
        window.clearTimeout(resetTimerRef.current);
      }
    };
  }, []);

  function showStatus(nextStatus: "shared" | "copied" | "error") {
    setStatus(nextStatus);
    if (resetTimerRef.current !== null) {
      window.clearTimeout(resetTimerRef.current);
    }
    resetTimerRef.current = window.setTimeout(() => {
      setStatus("idle");
      resetTimerRef.current = null;
    }, 2000);
  }

  async function handleShare() {
    if (status !== "idle") return;

    try {
      if (navigator.share) {
        await navigator.share({ title, url });
        showStatus("shared");
      } else {
        await navigator.clipboard.writeText(url);
        showStatus("copied");
      }
    } catch (err) {
      // Ignore abort errors from Web Share API
      if (!isAbortError(err)) {
        try {
          await navigator.clipboard.writeText(url);
          showStatus("copied");
        } catch {
          showStatus("error");
        }
      }
    }
  }

  return (
    <>
      <button
        aria-label="Share this story"
        className="group flex h-9 items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--card-bg)] px-3 text-sm font-medium text-[var(--accent)] shadow-sm transition-colors hover:border-[var(--primary)] hover:bg-[var(--accent-soft)]"
        onClick={() => void handleShare()}
        type="button"
      >
        {status === "idle" ? <ShareIcon /> : status === "error" ? <ErrorIcon /> : <CheckIcon />}
        <span className="hidden sm:inline">
          {status === "shared" ? "Shared!" : status === "copied" ? "Copied!" : status === "error" ? "Share failed" : "Share"}
        </span>
      </button>
      <span aria-live="polite" className="sr-only">
        {status === "shared"
          ? "Story shared successfully."
          : status === "copied"
            ? "Story link copied to clipboard."
            : status === "error"
              ? "Sharing failed."
              : ""}
      </span>
    </>
  );
}
