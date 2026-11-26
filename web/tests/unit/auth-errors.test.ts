import { describe, expect, it } from "vitest";

import {
  AUTH_ERROR_CODES,
  getAuthErrorMessage,
  mapAuthErrorToCode,
  parseAuthErrorCode,
} from "@/lib/auth/auth-errors";

const expectedMessages = {
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

describe("auth error codes", () => {
  it("defines only the fixed public error contract", () => {
    expect(AUTH_ERROR_CODES).toEqual([
      "unverified_email",
      "invalid_email",
      "legacy_email",
      "identity_conflict",
      "expired_link",
      "unknown",
    ]);
  });

  it.each(AUTH_ERROR_CODES)("maps %s to a fixed message", (code) => {
    expect(parseAuthErrorCode(code)).toBe(code);
    expect(getAuthErrorMessage(code)).toBe(expectedMessages[code]);
  });

  it.each([
    "",
    "UNKNOWN",
    " unknown",
    "unknown ",
    "unknown<script>",
    "//evil.example",
    "identity_conflict&returnTo=//evil.example",
  ])("rejects hostile or non-exact input %j", (value) => {
    expect(parseAuthErrorCode(value)).toBeNull();
  });

  it.each([
    "unverified_email",
    "invalid_email",
    "legacy_email",
    "identity_conflict",
  ])("maps a structured %s failure without reflecting its message", (code) => {
    const error = Object.assign(new Error("sensitive provider detail"), {
      code,
    });

    expect(mapAuthErrorToCode(error)).toBe(code);
  });

  it.each([
    "missing_pkce_cookie",
    "oauth_state_mismatch",
    "missing_auth_params",
    "invalid_grant",
    "ERR_JWT_EXPIRED",
  ])("maps provider code %s to expired_link", (code) => {
    expect(
      mapAuthErrorToCode(
        Object.assign(new Error("sensitive provider detail"), { code }),
      ),
    ).toBe("expired_link");
  });

  it.each([
    Object.assign(new Error("invalid_grant"), { status: 400 }),
    Object.assign(new Error("Access token expired"), {
      code: "ERR_JWT_EXPIRED",
    }),
    new Error("The sign-in link has expired"),
  ])("maps expired-provider failures to expired_link", (error) => {
    expect(mapAuthErrorToCode(error)).toBe("expired_link");
  });

  it("maps unknown and hostile failures to unknown", () => {
    expect(mapAuthErrorToCode(new Error("secret internal detail"))).toBe(
      "unknown",
    );
    expect(mapAuthErrorToCode({ code: "not-a-public-code" })).toBe("unknown");
    expect(mapAuthErrorToCode("raw error string")).toBe("unknown");
  });
});
