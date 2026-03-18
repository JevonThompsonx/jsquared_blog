"use client";

import { useEffect } from "react";

export function PostViewTracker({ postId }: { postId: string }) {
  useEffect(() => {
    const storageKey = `j2-viewed-post:${postId}`;

    try {
      if (window.sessionStorage.getItem(storageKey) === "1") {
        return;
      }

      window.sessionStorage.setItem(storageKey, "1");
    } catch {
      // Ignore sessionStorage availability issues and fall back to cookie dedupe.
    }

    void fetch(`/api/posts/${encodeURIComponent(postId)}/view`, {
      method: "POST",
      keepalive: true,
      credentials: "same-origin",
    }).catch(() => {
      // View tracking is intentionally fire-and-forget.
    });
  }, [postId]);

  return null;
}
