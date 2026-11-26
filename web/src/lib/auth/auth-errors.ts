export const AUTH_ERROR_CODES = [
  "unverified_email",
  "invalid_email",
  "legacy_email",
  "identity_conflict",
  "expired_link",
  "unknown",
] as const;

export type AuthErrorCode = (typeof AUTH_ERROR_CODES)[number];

const AUTH_ERROR_MESSAGES: Record<AuthErrorCode, string> = {
  unverified_email:
    "Your email address is not verified. Use the verification code sent to your email, then try again.",
  invalid_email:
    "The email address returned by the sign-in provider is invalid. Try another sign-in method.",
  legacy_email:
    "This account cannot be linked automatically. Contact support for help.",
  identity_conflict:
    "This sign-in identity is already linked to another account. Contact support for help.",
  expired_link:
    "This sign-in link has expired. Request a new email code and try again.",
  unknown: "Sign-in failed. Please try again.",
};

export function parseAuthErrorCode(
  raw: string | null | undefined,
): AuthErrorCode | null {
  return typeof raw === "string" &&
    (AUTH_ERROR_CODES as readonly string[]).includes(raw)
    ? (raw as AuthErrorCode)
    : null;
}

export function getAuthErrorMessage(code: AuthErrorCode): string {
  return AUTH_ERROR_MESSAGES[code];
}

export function mapAuthErrorToCode(error: unknown): AuthErrorCode {
  if (error && typeof error === "object") {
    const structuredCode = parseAuthErrorCode(
      (error as { code?: unknown }).code as string | undefined,
    );
    if (structuredCode) return structuredCode;

    const message = error instanceof Error ? error.message : "";
    const providerCode = (error as { code?: unknown }).code;
    if (
      providerCode === "ERR_JWT_EXPIRED" ||
      providerCode === "missing_pkce_cookie" ||
      providerCode === "oauth_state_mismatch" ||
      providerCode === "missing_auth_params" ||
      providerCode === "invalid_grant" ||
      /\b(?:expired|invalid_grant)\b/i.test(message)
    ) {
      return "expired_link";
    }
  }

  return "unknown";
}
