const REDIRECT_CONTROL_CHARACTER_PATTERN = /[\u0000-\u001F\u007F\\]/;

/**
 * Validates a redirect path from user-supplied input, returning it only if it
 * is a safe relative path. Falls back to "/" for any external, protocol-relative,
 * or malformed values.
 */
export function safeRedirectPath(raw: string | null): string {
  if (
    raw &&
    raw.startsWith("/") &&
    !raw.startsWith("//") &&
    !REDIRECT_CONTROL_CHARACTER_PATTERN.test(raw)
  ) {
    return raw;
  }

  return "/";
}
