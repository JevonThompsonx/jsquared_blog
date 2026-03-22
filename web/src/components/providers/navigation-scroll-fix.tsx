"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

/**
 * Disables smooth scrolling during Next.js App Router SPA navigation.
 *
 * Problem: html has `scroll-behavior: smooth`. When a <Link> is clicked,
 * Next.js calls window.scrollTo(0,0) programmatically, triggering a smooth
 * scroll animation. While that animation runs, Suspense swaps in loading
 * skeletons with different heights, causing the animation to land at the
 * wrong position.
 *
 * Fix: On pathname change, set scroll-behavior: auto for one frame so the
 * scroll-to-top completes instantly, then restore smooth.
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
    });

    return () => cancelAnimationFrame(raf);
  }, [pathname]);

  return null;
}
