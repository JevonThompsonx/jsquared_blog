"use client";

import { useState } from "react";
import { formatRelativeDate, formatSeasonYear } from "@/lib/utils";

const STORAGE_KEY = "j2_date_format";

export function PostDate({ dateString, className }: { dateString: string; className?: string }) {
  const [format, setFormat] = useState<"absolute" | "relative">(() => {
    if (typeof window === "undefined") {
      return "absolute";
    }

    return window.localStorage.getItem(STORAGE_KEY) === "relative" ? "relative" : "absolute";
  });

  function toggle() {
    const next = format === "absolute" ? "relative" : "absolute";
    setFormat(next);
    localStorage.setItem(STORAGE_KEY, next);
  }

  const label = format === "relative"
    ? formatRelativeDate(dateString)
    : formatSeasonYear(dateString);

  return (
    <time
      className={`cursor-pointer transition-colors hover:text-[var(--accent)] ${className ?? ""}`}
      dateTime={dateString}
      onClick={toggle}
      suppressHydrationWarning
      title={format === "relative" ? "Click for season and year" : "Click for time ago"}
    >
      {label}
    </time>
  );
}
