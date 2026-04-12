/**
 * Formats a comment date string as relative time (e.g. "3h ago") with an
 * absolute date fallback once the comment is more than a week old.
 *
 * @param dateString - ISO 8601 date string stored on the comment record.
 * @param includeTime - When true, the absolute fallback includes hour/minute
 *   (used by admin views). Defaults to false (public comment threads).
 */
export function formatCommentDate(dateString: string, includeTime = false): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return "just now";
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    ...(includeTime ? { hour: "numeric", minute: "numeric" } : {}),
  });
}
