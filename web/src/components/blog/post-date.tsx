"use client";

import { useEffect, useState } from "react";

import { formatPublishedDate, formatRelativeDate } from "@/lib/utils";

const STORAGE_KEY = "j2_date_format";

export function PostDate({ dateString, className }: { dateString: string; className?: string }) {
  // Default to "absolute" — matches SSR output to avoid hydration mismatch
  const [format, setFormat] = useState<"absolute" | "relative">("absolute");

  useEffect(() => {
    if (localStorage.getItem(STORAGE_KEY) === "relative") {
      setFormat("relative");
    }
  }, []);

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
