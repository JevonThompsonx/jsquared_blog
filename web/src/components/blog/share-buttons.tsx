"use client";

import { useState } from "react";

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
      className="h-4 w-4 shrink-0 text-emerald-500"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      viewBox="0 0 24 24"
    >
      <polyline points="20 6 9 17 4 12" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function ShareButtons({ url, title }: { url: string; title: string }) {
  const [status, setStatus] = useState<"idle" | "shared" | "copied">("idle");

  async function handleShare() {
    if (status !== "idle") return;

    try {
      if (navigator.share) {
        await navigator.share({ title, url });
        setStatus("shared");
      } else {
        await navigator.clipboard.writeText(url);
        setStatus("copied");
      }
    } catch (err) {
      // Ignore abort errors from Web Share API
      if ((err as Error).name !== "AbortError") {
        try {
          await navigator.clipboard.writeText(url);
          setStatus("copied");
        } catch {
          // Fallback failed
        }
      }
    }

    if (status === "idle") {
      setTimeout(() => setStatus("idle"), 2000);
    }
  }

  return (
    <button
      aria-label="Share this story"
      className="group flex h-9 items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--card-bg)] px-3 text-sm font-medium text-[var(--accent)] shadow-sm transition-colors hover:border-[var(--primary)] hover:bg-[var(--accent-soft)]"
      onClick={() => void handleShare()}
      type="button"
    >
      {status === "idle" ? <ShareIcon /> : <CheckIcon />}
      <span className="hidden sm:inline">
        {status === "shared" ? "Shared!" : status === "copied" ? "Copied!" : "Share"}
      </span>
    </button>
  );
}
