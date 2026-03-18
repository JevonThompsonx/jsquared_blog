"use client";

import { useEffect } from "react";

export function PostViewTracker({ postId }: { postId: string }) {
  useEffect(() => {
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
