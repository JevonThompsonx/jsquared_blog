"use client";

import { useEffect, useState } from "react";

const MILESTONE_THRESHOLDS = [0.25, 0.5, 0.75, 1] as const;

type Milestone = (typeof MILESTONE_THRESHOLDS)[number];

function milestoneLabel(milestone: Milestone): string {
  if (milestone === 1) return "Reading complete. 100% scrolled.";
  return `Reading progress: ${Math.round(milestone * 100)}%.`;
}

function nextMilestone(progress: number): Milestone | null {
  let reached: Milestone | null = null;
  for (const threshold of MILESTONE_THRESHOLDS) {
    if (progress >= threshold) {
      reached = threshold;
    }
  }
  return reached;
}

export function ReadingProgressBar() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    function handleScroll() {
      const { scrollTop, scrollHeight, clientHeight } = document.documentElement;
      const scrollable = scrollHeight - clientHeight;
      setProgress(scrollable > 0 ? scrollTop / scrollable : 0);
    }

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Derive the announcement string from progress directly. React keeps the
  // <span> textContent stable when the derived value hasn't actually changed,
  // so the polite live region does not re-announce the same milestone.
  const reached = nextMilestone(progress);
  const announcement = reached !== null ? milestoneLabel(reached) : "";

  return (
    <>
      <div
        aria-hidden="true"
        className="fixed left-0 top-0 z-50 h-[3px] bg-[var(--primary)] origin-left"
        style={{ width: `${progress * 100}%` }}
      />
      <span role="status" aria-live="polite" className="sr-only">
        {announcement}
      </span>
    </>
  );
}
