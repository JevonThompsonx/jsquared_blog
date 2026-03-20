"use client";

import { useEffect, useMemo, useState } from "react";
import { flushSync } from "react-dom";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { z } from "zod";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";

type State = "loading" | "unauthenticated" | "bookmarked" | "unbookmarked";

const bookmarkResponseSchema = z.object({
  bookmarked: z.boolean(),
});

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
      <path d="M5 3h14a1 1 0 0 1 1 1v17l-7-3.5L6 21V4a1 1 0 0 1 1-1H5z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function BookmarkButton({ postId }: { postId: string }) {
  const pathname = usePathname();
  const [state, setState] = useState<State>("loading");

  const supabase = useMemo(() => {
    try {
      return getSupabaseBrowserClient();
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    if (!supabase) {
      flushSync(() => {
        setState("unauthenticated");
      });
      return;
    }

    let cancelled = false;

    void (async () => {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) {
        if (!cancelled) setState("unauthenticated");
        return;
      }

      const res = await fetch(`/api/posts/${postId}/bookmark`, {
        headers: { Authorization: `Bearer ${token}` },
      });
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
  }, [supabase, postId]);

  async function handleToggle() {
    if (!supabase) return;
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) {
      setState("unauthenticated");
      return;
    }

    // Optimistic update
    const next = state === "bookmarked" ? "unbookmarked" : "bookmarked";
    setState(next);

    const res = await fetch(`/api/posts/${postId}/bookmark`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      const json = bookmarkResponseSchema.parse(await res.json());
      setState(json.bookmarked ? "bookmarked" : "unbookmarked");
    } else {
      // Revert on error
      setState(state);
    }
  }

  if (state === "loading") {
    return (
      <div className="flex h-11 w-11 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--card-bg)] opacity-40">
        <BookmarkIcon filled={false} />
      </div>
    );
  }

  if (state === "unauthenticated") {
    return (
      <Link
        aria-label="Sign in to save this post"
        className="flex h-11 items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--card-bg)] px-3 text-sm font-medium text-[var(--text-secondary)] shadow-sm transition-colors hover:border-[var(--primary)] hover:text-[var(--primary)]"
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
    <button
      aria-label={isBookmarked ? "Remove bookmark from this post" : "Save this post"}
      className={`flex h-11 items-center gap-2 rounded-full border px-3 text-sm font-medium shadow-sm transition-all duration-200 ${
        isBookmarked
          ? "border-[var(--primary)] bg-[var(--accent-soft)] text-[var(--primary)]"
          : "border-[var(--border)] bg-[var(--card-bg)] text-[var(--text-secondary)] hover:border-[var(--primary)] hover:text-[var(--primary)]"
      }`}
      onClick={() => void handleToggle()}
      title={isBookmarked ? "Remove bookmark" : "Save this post"}
      type="button"
    >
      <BookmarkIcon filled={isBookmarked} />
      <span className="hidden sm:inline">{isBookmarked ? "Saved" : "Save"}</span>
    </button>
  );
}
