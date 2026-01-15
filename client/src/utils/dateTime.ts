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
