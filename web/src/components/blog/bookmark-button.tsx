"use client";

import { useAuth } from "@workos-inc/authkit-nextjs/components";
import { useEffect, useState } from "react";
import { flushSync } from "react-dom";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { z } from "zod";

type State = "loading" | "unauthenticated" | "bookmarked" | "unbookmarked";

const bookmarkResponseSchema = z.object({
  bookmarked: z.boolean(),
});

const FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]";

function BookmarkIcon({ filled }: { filled: boolean }) {
  return (
    <svg
      aria-hidden="true"
      className="h-4 w-4 shrink-0 transition-transform duration-200"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="2"
      viewBox="0 0 24 24"
    >
      <path
        d="M5 3h14a1 1 0 0 1 1 1v17l-7-3.5L6 21V4a1 1 0 0 1 1-1H5z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function BookmarkButton({ postId }: { postId: string }) {
  const pathname = usePathname();
  const [state, setState] = useState<State>("loading");
  const [saveError, setSaveError] = useState<string | null>(null);
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading) return;

    if (!user) {
      flushSync(() => {
        setState("unauthenticated");
      });
      return;
    }

    let cancelled = false;

    void (async () => {
      const res = await fetch(`/api/posts/${postId}/bookmark`);
      if (!cancelled) {
        if (res.ok) {
          const json = bookmarkResponseSchema.parse(await res.json());
          setState(json.bookmarked ? "bookmarked" : "unbookmarked");
        } else {
          setState("unbookmarked");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [loading, user, postId]);

  async function handleToggle() {
    if (!user) {
      setState("unauthenticated");
      return;
    }
    setSaveError(null);

    // Optimistic update
    const previous = state;
    const next = state === "bookmarked" ? "unbookmarked" : "bookmarked";
    setState(next);

    try {
      const res = await fetch(`/api/posts/${postId}/bookmark`, {
        method: "POST",
      });
      if (res.ok) {
        const json = bookmarkResponseSchema.parse(await res.json());
        setState(json.bookmarked ? "bookmarked" : "unbookmarked");
      } else {
        // Revert on error
        setState(previous);
        setSaveError("Could not update your bookmark.");
      }
    } catch {
      setState(previous);
      setSaveError("Could not update your bookmark.");
    }
  }

  function renderError() {
    if (!saveError) return null;
    return (
      <span
        className="flex items-center gap-2 text-xs text-[var(--color-error-text)]"
        role="alert"
      >
        <span>{saveError}</span>
        <button
          className={`rounded-full border border-[var(--color-error-soft-border)] bg-[var(--card-bg)] px-2 py-0.5 font-semibold ${FOCUS_RING}`}
          onClick={() => void handleToggle()}
          type="button"
        >
          Try again
        </button>
      </span>
    );
  }

  if (state === "loading") {
    return (
      <div
        className="bookmark-button flex h-11 w-11 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--card-bg)] opacity-40"
        data-print-hide
      >
        <BookmarkIcon filled={false} />
      </div>
    );
  }

  if (state === "unauthenticated") {
    return (
      <Link
        aria-label="Sign in to save this post"
        className={`bookmark-button flex h-11 items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--card-bg)] px-3 text-sm font-medium text-[var(--text-secondary)] shadow-sm transition-colors hover:border-[var(--primary)] hover:text-[var(--primary)] ${FOCUS_RING}`}
        data-print-hide
        href={{ pathname: "/login", query: { redirectTo: pathname } }}
        title="Sign in to save this post"
      >
        <BookmarkIcon filled={false} />
        <span className="hidden sm:inline">Save</span>
      </Link>
    );
  }

  const isBookmarked = state === "bookmarked";

  return (
    <div className="flex flex-col items-start gap-1">
      <button
        aria-label={
          isBookmarked ? "Remove bookmark from this post" : "Save this post"
        }
        aria-pressed={isBookmarked}
        className={`bookmark-button flex h-11 items-center gap-2 rounded-full border px-3 text-sm font-medium shadow-sm transition-all duration-200 ${
          isBookmarked
            ? "border-[var(--primary)] bg-[var(--accent-soft)] text-[var(--primary)]"
            : "border-[var(--border)] bg-[var(--card-bg)] text-[var(--text-secondary)] hover:border-[var(--primary)] hover:text-[var(--primary)]"
        } ${FOCUS_RING}`}
        data-print-hide
        onClick={() => void handleToggle()}
        title={isBookmarked ? "Remove bookmark" : "Save this post"}
        type="button"
      >
        <BookmarkIcon filled={isBookmarked} />
        <span className="hidden sm:inline">
          {isBookmarked ? "Saved" : "Save"}
        </span>
      </button>
      {renderError()}
    </div>
  );
}
