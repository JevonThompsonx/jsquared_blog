/**
 * Returns up to two initials from a display name, capitalised.
 * Uses whitespace-splitting so leading/trailing space and multi-space
 * separators are handled correctly.
 *
 * @example getInitials("Jevon Thompson") // "JT"
 * @example getInitials("Madonna")        // "M"
 */
export function getInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}
