import { describe, expect, it } from "vitest";

import { safeRedirectPath } from "@/lib/auth/redirect";

describe("safe auth return paths", () => {
  it.each([
    "/",
    "/account",
    "/bookmarks",
    "/posts/a-story?sort=newest#comments",
    "/admin",
    "/admin/posts/new",
  ])("preserves the safe relative path %s", (value) => {
    expect(safeRedirectPath(value)).toBe(value);
  });

  it.each([
    null,
    "",
    "https://evil.example/account",
    "http://evil.example",
    "//evil.example/account",
    "///evil.example",
    "/\\evil.example",
    "\\\\evil.example",
    "/%5Cevil.example",
    "/%2f%2fevil.example",
    "/%252f%252fevil.example",
    "/account%0d%0aLocation:%20https://evil.example",
    "/account%250d%250a",
    "/account\nLocation: https://evil.example",
    "javascript:alert(1)",
    " /account",
  ])("rejects the unsafe value %j", (value) => {
    expect(safeRedirectPath(value)).toBe("/");
  });

  it.each([
    "/login",
    "/login?redirectTo=/account",
    "/signup",
    "/callback",
    "/callback?code=test",
    "/api/auth/login",
    "/api/auth/signup",
    "/api/auth/logout",
    "/%6Cogin",
  ])("prevents an authentication loop through %s", (value) => {
    expect(safeRedirectPath(value)).toBe("/");
  });
});
