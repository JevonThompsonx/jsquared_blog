"use client";

import { useState } from "react";
import { formatPublishedDate, formatRelativeDate } from "@/lib/utils";

const STORAGE_KEY = "j2_date_format";

function getInitialFormat(): "absolute" | "relative" {
  if (typeof window === "undefined") {
    return "absolute";
  }

  return window.localStorage.getItem(STORAGE_KEY) === "relative" ? "relative" : "absolute";
}

export function PostDate({ dateString, className }: { dateString: string; className?: string }) {
  // Default to "absolute" — matches SSR output to avoid hydration mismatch
  const [format, setFormat] = useState<"absolute" | "relative">(getInitialFormat);

  function toggle() {
    const next = format === "absolute" ? "relative" : "absolute";
    setFormat(next);
    localStorage.setItem(STORAGE_KEY, next);
  }

  const label = format === "relative"
    ? formatRelativeDate(dateString)
    : formatPublishedDate(dateString);

  return (
    <time
      className={`cursor-pointer transition-colors hover:text-[var(--accent)] ${className ?? ""}`}
      dateTime={dateString}
      onClick={toggle}
      title={format === "relative" ? "Click for exact date" : "Click for relative date"}
    >
      {label}
    </time>
  );
}
