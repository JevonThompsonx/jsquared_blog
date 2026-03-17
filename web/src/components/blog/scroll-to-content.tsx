"use client";

import { useEffect, useRef } from "react";

type ScrollToContentProps = {
  hasFeaturedImage: boolean;
};

export function ScrollToContent({ hasFeaturedImage }: ScrollToContentProps) {
  const hasAttemptedScrollRef = useRef(false);

  useEffect(() => {
    // Only attempt scroll once per mount to respect back/forward cache
    if (hasAttemptedScrollRef.current) {
      return;
    }
    hasAttemptedScrollRef.current = true;

    // Respect hash links
    if (window.location.hash) {
      return;
    }

    let cancelled = false;
    const retryTimers: number[] = [];

    const scrollToBestTarget = (attempt = 0) => {
      if (cancelled) {
        return;
      }

      const articleTop = document.getElementById("article-top");
      const tableOfContents = document.getElementById("table-of-contents");
      const proseContent = document.querySelector<HTMLElement>(".prose-content");

      const target = hasFeaturedImage
        ? articleTop
        : tableOfContents ?? proseContent ?? articleTop;

      if (target) {
        const top = target.getBoundingClientRect().top + window.scrollY - 32;
        // Check if we are already near the top (e.g. user manually scrolled quickly)
        if (window.scrollY < top - 100) {
           window.scrollTo({ top, behavior: "auto" });
        }
        return;
      }

      if (attempt >= 5) {
        return;
      }

      const timer = window.setTimeout(() => {
        scrollToBestTarget(attempt + 1);
      }, 100);
      retryTimers.push(timer);
    };

    const initialTimer = window.setTimeout(() => {
      scrollToBestTarget();
    }, 50);
    retryTimers.push(initialTimer);

    return () => {
      cancelled = true;
      for (const timer of retryTimers) {
        window.clearTimeout(timer);
      }
    };
  }, [hasFeaturedImage]);

  return null;
}
