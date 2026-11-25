"use client";

import { useState } from "react";
import { formatRelativeDate, formatSeasonYear } from "@/lib/utils";

const STORAGE_KEY = "j2_date_format";

export function PostDate({
  dateString,
  className,
  interactive = true,
}: {
  dateString: string;
  className?: string;
  /** Set false when rendered inside a link/card to avoid nested interactive elements. */
  interactive?: boolean;
}) {
  const [format, setFormat] = useState<"absolute" | "relative">(() => {
    if (typeof window === "undefined") {
      return "absolute";
    }

    return window.localStorage.getItem(STORAGE_KEY) === "relative"
      ? "relative"
      : "absolute";
  });

  function toggle(event: React.MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();
    const next = format === "absolute" ? "relative" : "absolute";
    setFormat(next);
    localStorage.setItem(STORAGE_KEY, next);
  }

  if (!interactive) {
    return (
      <span className={className}>
        <time dateTime={dateString} suppressHydrationWarning>
          {formatSeasonYear(dateString)}
        </time>
      </span>
    );
  }

  const label =
    format === "relative"
      ? formatRelativeDate(dateString)
      : formatSeasonYear(dateString);

  return (
    <button
      className={`cursor-pointer rounded-sm transition-colors hover:text-[var(--accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] ${className ?? ""}`}
      onClick={toggle}
      title={
        format === "relative"
          ? "Click for season and year"
          : "Click for time ago"
      }
      type="button"
    >
      <time dateTime={dateString} suppressHydrationWarning>
        {label}
      </time>
    </button>
  );
}
