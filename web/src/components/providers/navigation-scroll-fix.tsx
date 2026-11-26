"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

/**
 * Disables smooth scrolling during Next.js App Router SPA navigation and moves
 * focus to the new page's main landmark.
 *
 * Problem 1: html has `scroll-behavior: smooth`. When a <Link> is clicked,
 * Next.js calls window.scrollTo(0,0) programmatically, triggering a smooth
 * scroll animation. While that animation runs, Suspense swaps in loading
 * skeletons with different heights, causing the animation to land at the
 * wrong position.
 *
 * Problem 2: SPA navigation keeps focus on the clicked link, so keyboard and
 * screen-reader users are left at the old location with no announcement that
 * the page changed. Focusing `#main-content` (tabindex=-1) resets the reading
 * position without scrolling, since the scroll-to-top below owns scrolling.
 *
 * Fix: On pathname change, set scroll-behavior: auto for one frame so the
 * scroll-to-top completes instantly, restore smooth, then focus main with
 * `preventScroll` so focus never fights the scroll reset.
 */
export function NavigationScrollFix() {
  const pathname = usePathname();
  const prevPathname = useRef(pathname);

  useEffect(() => {
    if (prevPathname.current === pathname) return;
    prevPathname.current = pathname;

    const html = document.documentElement;
    html.style.scrollBehavior = "auto";

    // Scroll to top instantly (in case the framework hasn't done it yet)
    window.scrollTo(0, 0);

    // Restore smooth scroll after the current paint
    const raf = requestAnimationFrame(() => {
      html.style.scrollBehavior = "";

      // A hash navigation targets a specific element; leave focus alone there.
      if (window.location.hash) return;

      const main = document.querySelector<HTMLElement>(
        "main[tabindex='-1'], #main-content",
      );
      main?.focus({ preventScroll: true });
    });

    return () => cancelAnimationFrame(raf);
  }, [pathname]);

  return null;
}
