"use client";

import { useEffect, useState } from "react";

import type { TocHeading } from "@/lib/content";

export function TableOfContents({ headings }: { headings: TocHeading[] }) {
  const [activeId, setActiveId] = useState<string | null>(headings[0]?.id ?? null);
  const [isOpen, setIsOpen] = useState(true);

  useEffect(() => {
    function update() {
      // 128px = sticky header (~80px) + some breathing room
      const threshold = window.scrollY + 128;
      let current: string | null = null;
      for (const { id } of headings) {
        const el = document.getElementById(id);
        if (el && el.offsetTop <= threshold) {
          current = id;
        }
      }
      setActiveId(current);
    }

    window.addEventListener("scroll", update, { passive: true });
    update();
    return () => window.removeEventListener("scroll", update);
  }, [headings]);

  return (
    <nav
      id="table-of-contents"
      aria-label="Table of contents"
      className="mb-8 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--accent-soft)]"
    >
      <button
        aria-expanded={isOpen}
        className="flex w-full items-center justify-between px-5 py-3.5 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--primary)]"
        onClick={() => setIsOpen((o) => !o)}
        type="button"
      >
        <span className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--accent)]">
          Contents
        </span>
        <svg
          aria-hidden="true"
          className={`h-3.5 w-3.5 shrink-0 text-[var(--text-secondary)] transition-transform duration-200 ${isOpen ? "" : "-rotate-90"}`}
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          viewBox="0 0 24 24"
        >
          <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {isOpen ? (
        <ul className="space-y-0.5 border-t border-[var(--border)] px-4 pb-4 pt-3">
          {headings.map((h) => {
            const isActive = activeId === h.id;
            return (
              <li key={h.id} style={{ paddingLeft: `${(h.level - 2) * 1}rem` }}>
                <a
                  className={`flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm font-semibold leading-snug transition-colors ${
                    isActive
                      ? "text-[var(--primary)]"
                      : "text-[var(--text-primary)] opacity-75 hover:bg-[var(--card-bg)] hover:opacity-100"
                  }`}
                  href={`#${h.id}`}
                  onClick={(e) => {
                    e.preventDefault();
                    document.getElementById(h.id)?.scrollIntoView({ behavior: "smooth", block: "start" });
                    setTimeout(() => setActiveId(h.id), 50);
                  }}
                >
                  <span
                    className={`h-1.5 w-1.5 shrink-0 rounded-full transition-colors ${
                      isActive ? "bg-[var(--primary)]" : "bg-transparent"
                    }`}
                  />
                  {h.text}
                </a>
              </li>
            );
          })}
        </ul>
      ) : null}
    </nav>
  );
}
