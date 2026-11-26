const REDIRECT_CONTROL_CHARACTER_PATTERN = /[\u0000-\u001F\u007F\\]/;
const AUTH_LOOP_PATHS = [
  "/login",
  "/signup",
  "/callback",
  "/logout",
  "/forgot-password",
  "/reset-password",
  "/verify-email",
  "/api/auth",
];

function isSafeRelativePath(value: string): boolean {
  return (
    value.startsWith("/") &&
    !value.startsWith("//") &&
    !REDIRECT_CONTROL_CHARACTER_PATTERN.test(value)
  );
}

function isAuthLoop(value: string): boolean {
  const pathname = value.split(/[?#]/, 1)[0]?.toLowerCase() ?? "";
  return AUTH_LOOP_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );
}

/**
 * Validates a redirect path from user-supplied input, returning it only if it
 * remains a safe same-origin path after bounded percent-decoding. Falls back to
 * "/" for external, protocol-relative, malformed, or authentication-loop values.
 */
export function safeRedirectPath(raw: string | null): string {
  if (!raw) {
    return "/";
  }

  let candidate = raw;
  for (let depth = 0; depth < 4; depth += 1) {
    if (!isSafeRelativePath(candidate) || isAuthLoop(candidate)) {
      return "/";
    }

    try {
      const decoded = decodeURIComponent(candidate);
      if (decoded === candidate) {
        return raw;
      }
      candidate = decoded;
    } catch {
      return "/";
    }
  }

  return "/";
}
