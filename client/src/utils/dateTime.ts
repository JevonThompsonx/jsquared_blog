/**
 * Utility functions for datetime handling
 */

/**
 * Convert ISO datetime string (UTC) to datetime-local input format (local time)
 * @param isoString - ISO 8601 datetime string (e.g., "2026-01-13T02:40:00Z")
 * @returns Local datetime string for datetime-local input (e.g., "2026-01-12T18:40")
 */
export function isoToLocalDateTimeInput(isoString: string | null | undefined): string {
  if (!isoString) return "";

  const date = new Date(isoString);

  // Get local date/time components
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");

  // Format for datetime-local input: YYYY-MM-DDTHH:mm
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

/**
 * Convert datetime-local input value to ISO string (UTC)
 * @param localDateTimeString - Local datetime string from input (e.g., "2026-01-12T18:40")
 * @returns ISO 8601 datetime string (e.g., "2026-01-13T02:40:00.000Z")
 */
export function localDateTimeInputToISO(localDateTimeString: string | null | undefined): string | null {
  if (!localDateTimeString) return null;

  // Create Date object from local datetime string
  // The browser automatically treats this as local time
  const date = new Date(localDateTimeString);

  // Convert to ISO string (UTC)
  return date.toISOString();
}

/**
 * Get current local datetime for datetime-local input min attribute
 * @returns Local datetime string (e.g., "2026-01-12T18:40")
 */
export function getCurrentLocalDateTimeInput(): string {
  return isoToLocalDateTimeInput(new Date().toISOString());
}

/**
 * Format a date string according to user preference
 * @param dateString - ISO 8601 datetime string (e.g., "2026-01-13T02:40:00Z")
 * @param format - "relative" (e.g., "5 days ago") or "absolute" (e.g., "Jan 10, 2026")
 * @returns Formatted date string
 */
export function formatDate(dateString: string, format: "relative" | "absolute" = "relative"): string {
  if (!dateString) return "";
  
  const date = new Date(dateString);
  
  if (format === "absolute") {
    // Absolute format: "Jan 10, 2026"
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }
  
  // Relative format: "5 days ago", "2 hours ago", etc.
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);
  const diffWeeks = Math.floor(diffDays / 7);
  const diffMonths = Math.floor(diffDays / 30);
  const diffYears = Math.floor(diffDays / 365);
  
  if (diffSeconds < 60) {
    return "just now";
  } else if (diffMinutes < 60) {
    return `${diffMinutes} ${diffMinutes === 1 ? "minute" : "minutes"} ago`;
  } else if (diffHours < 24) {
    return `${diffHours} ${diffHours === 1 ? "hour" : "hours"} ago`;
  } else if (diffDays < 7) {
    return `${diffDays} ${diffDays === 1 ? "day" : "days"} ago`;
  } else if (diffWeeks < 4) {
    return `${diffWeeks} ${diffWeeks === 1 ? "week" : "weeks"} ago`;
  } else if (diffMonths < 12) {
    return `${diffMonths} ${diffMonths === 1 ? "month" : "months"} ago`;
  } else {
    return `${diffYears} ${diffYears === 1 ? "year" : "years"} ago`;
  }
}

/**
 * Format date to season and year (e.g., "Spring 2026")
 * This is kept for backward compatibility and special use cases
 * @param dateString - ISO 8601 datetime string
 * @returns Season and year string (e.g., "Spring 2026")
 */
export function formatDateToSeasonYear(dateString: string): string {
  if (!dateString) return "";
  const date = new Date(dateString);
  const month = date.getMonth();
  const year = date.getFullYear();
  if (month >= 2 && month <= 4) return `Spring ${year}`;
  if (month >= 5 && month <= 7) return `Summer ${year}`;
  if (month >= 8 && month <= 10) return `Fall ${year}`;
  return `Winter ${year}`;
}
