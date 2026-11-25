import type { HandleAuthOptions } from "@workos-inc/authkit-nextjs";
import { NextRequest, NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  handleAuthMock,
  getSignInUrlMock,
  getSignUpUrlMock,
  signOutMock,
  resolveWorkosIdentityMock,
  requireAdminSessionMock,
  cookiesSetMock,
  callbackHandlerMock,
  checkRateLimitMock,
  tooManyRequestsMock,
} = vi.hoisted(() => ({
  handleAuthMock: vi.fn((_options: HandleAuthOptions) => callbackHandlerMock),
  getSignInUrlMock: vi.fn(),
  getSignUpUrlMock: vi.fn(),
  signOutMock: vi.fn(),
  resolveWorkosIdentityMock: vi.fn(),
  requireAdminSessionMock: vi.fn(),
  cookiesSetMock: vi.fn(),
  callbackHandlerMock: vi.fn(),
  checkRateLimitMock: vi.fn(),
  tooManyRequestsMock: vi.fn(),
}));

vi.mock("@workos-inc/authkit-nextjs", () => ({
  handleAuth: handleAuthMock,
  getSignInUrl: getSignInUrlMock,
  getSignUpUrl: getSignUpUrlMock,
  signOut: signOutMock,
}));

vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: checkRateLimitMock,
  getClientIp: () => "hashed-test-ip",
  tooManyRequests: tooManyRequestsMock,
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({ set: cookiesSetMock })),
}));

vi.mock("@/server/auth/workos-identity", () => ({
  resolveWorkosIdentity: resolveWorkosIdentityMock,
  WorkosIdentityError: class WorkosIdentityError extends Error {},
}));

vi.mock("@/lib/auth/session", () => ({
  requireAdminSession: requireAdminSessionMock,
}));

import { GET as callbackGET } from "@/app/callback/route";
import { GET as loginGET } from "@/app/api/auth/login/route";
import { GET as signupGET } from "@/app/api/auth/signup/route";
import { GET as logoutGET } from "@/app/api/auth/logout/route";
import { GET as adminSessionGET } from "@/app/api/admin/session/route";
import { GET as publicSessionGET } from "@/app/api/auth/session/route";
import { parseAuthMaxAge } from "@/lib/auth/workos";

type CallbackOptions = HandleAuthOptions & {
  onSuccess: NonNullable<HandleAuthOptions["onSuccess"]>;
  onError: NonNullable<HandleAuthOptions["onError"]>;
};

function getCallbackOptions(): CallbackOptions {
  const options = handleAuthMock.mock.calls.at(-1)?.[0];
  if (!options?.onSuccess || !options.onError) {
    throw new Error("Callback handler was not configured");
  }
  return options as CallbackOptions;
}

const verifiedUser = {
  id: "user_workos_reader",
  email: "reader@example.com",
  emailVerified: true,
  name: "Reader",
};

beforeEach(() => {
  handleAuthMock.mockClear();
  callbackHandlerMock.mockReset();
  callbackHandlerMock.mockResolvedValue(new Response("ok"));
  checkRateLimitMock.mockReset();
  checkRateLimitMock.mockResolvedValue({
    allowed: true,
    limit: 20,
    remaining: 19,
    resetAt: Date.now() + 300_000,
  });
  tooManyRequestsMock.mockReset();
  tooManyRequestsMock.mockImplementation(
    () => new NextResponse("rate limited", { status: 429 }),
  );
  getSignInUrlMock.mockReset();
  getSignUpUrlMock.mockReset();
  signOutMock.mockReset();
  resolveWorkosIdentityMock.mockReset();
  requireAdminSessionMock.mockReset();
  cookiesSetMock.mockReset();
  getSignInUrlMock.mockResolvedValue("https://auth.example.test/sign-in");
  getSignUpUrlMock.mockResolvedValue("https://auth.example.test/sign-up");
  signOutMock.mockResolvedValue(undefined);
  resolveWorkosIdentityMock.mockResolvedValue({ id: "local-reader" });
  requireAdminSessionMock.mockResolvedValue(null);
});

describe("WorkOS callback", () => {
  it("rate limits callback attempts before invoking AuthKit", async () => {
    checkRateLimitMock.mockResolvedValue({ allowed: false });

    const response = await callbackGET(
      new NextRequest("https://jsquaredadventures.com/callback"),
    );

    expect(response.status).toBe(429);
    expect(checkRateLimitMock).toHaveBeenCalledWith(
      "auth-callback:hashed-test-ip",
      30,
      300_000,
    );
    expect(handleAuthMock).not.toHaveBeenCalled();
  });

  it("uses the validated per-request public base URL", async () => {
    await callbackGET(
      new NextRequest("http://127.0.0.1:3010/callback", {
        headers: { host: "www.jsquaredadventures.com" },
      }),
    );

    expect(callbackGET).toBeTypeOf("function");
    expect(handleAuthMock).toHaveBeenCalledWith(
      expect.objectContaining({
        baseURL: "https://www.jsquaredadventures.com",
      }),
    );
  });

  it("maps a verified identity during the callback without promoting it", async () => {
    await callbackGET(
      new NextRequest("https://jsquaredadventures.com/callback"),
    );
    const options = getCallbackOptions();
    await options.onSuccess({ user: verifiedUser } as never);

    expect(resolveWorkosIdentityMock).toHaveBeenCalledWith(
      verifiedUser,
      expect.objectContaining({ allowedEmails: expect.any(Array) }),
    );
    expect(resolveWorkosIdentityMock.mock.calls[0]?.[1]).toMatchObject({
      promoteAllowedUser: false,
    });
  });

  it("fails closed when callback identity mapping fails", async () => {
    await callbackGET(
      new NextRequest("https://jsquaredadventures.com/callback"),
    );
    const options = getCallbackOptions();
    resolveWorkosIdentityMock.mockRejectedValue(new Error("mapping failed"));

    await expect(
      options.onSuccess({ user: verifiedUser } as never),
    ).rejects.toThrow("mapping failed");
    const response = await options.onError({
      error: new Error("sensitive internal detail"),
      request: new NextRequest("http://127.0.0.1:3010/callback"),
    });
    expect(response.status).toBe(400);
    expect(await response.text()).not.toContain("sensitive internal detail");
  });
});

describe("auth maxAge validation", () => {
  it("clamps to 24 hours and rejects invalid values", () => {
    expect(parseAuthMaxAge("300")).toBe(300);
    expect(parseAuthMaxAge("999999")).toBe(86_400);
    for (const value of [null, "", "abc", "0", "-1", "1.5"]) {
      expect(parseAuthMaxAge(value)).toBeUndefined();
    }
  });
});

describe("WorkOS auth initiation routes", () => {
  it.each([
    ["login", loginGET, "auth-login:hashed-test-ip", 20, 300_000],
    ["signup", signupGET, "auth-signup:hashed-test-ip", 10, 3_600_000],
  ] as const)(
    "rate limits %s initiation",
    async (_name, handler, key, limit, windowMs) => {
      checkRateLimitMock.mockResolvedValue({ allowed: false });

      const response = await handler(
        new NextRequest("https://jsquaredadventures.com/api/auth/test"),
      );

      expect(response.status).toBe(429);
      expect(checkRateLimitMock).toHaveBeenCalledWith(key, limit, windowMs);
      expect(getSignInUrlMock).not.toHaveBeenCalled();
      expect(getSignUpUrlMock).not.toHaveBeenCalled();
    },
  );

  it("starts sign-in with a safe return path and the configured callback", async () => {
    const response = await loginGET(
      new NextRequest(
        "https://jsquaredadventures.com/api/auth/login?returnTo=/bookmarks&redirectTo=/account",
      ),
    );

    expect(getSignInUrlMock).toHaveBeenCalledWith({
      returnTo: "/bookmarks",
      redirectUri: "https://jsquaredadventures.com/callback",
    });
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "https://auth.example.test/sign-in",
    );
  });

  it("forwards a validated reauthentication maxAge", async () => {
    await loginGET(
      new NextRequest(
        "https://jsquaredadventures.com/api/auth/login?returnTo=%2Fadmin&maxAge=999999",
      ),
    );

    expect(getSignInUrlMock).toHaveBeenCalledWith({
      returnTo: "/admin",
      redirectUri: "https://jsquaredadventures.com/callback",
      maxAge: 86_400,
    });
  });

  it("uses the approved per-request www callback", async () => {
    await loginGET(
      new NextRequest("http://127.0.0.1:3010/api/auth/login", {
        headers: { host: "www.jsquaredadventures.com" },
      }),
    );

    expect(getSignInUrlMock).toHaveBeenCalledWith(
      expect.objectContaining({
        redirectUri: "https://www.jsquaredadventures.com/callback",
      }),
    );
  });

  it("rejects an untrusted request host", async () => {
    const response = await loginGET(
      new NextRequest("http://127.0.0.1:3010/api/auth/login", {
        headers: { host: "evil.example" },
      }),
    );

    expect(response.status).toBe(400);
    expect(getSignInUrlMock).not.toHaveBeenCalled();
  });

  it("starts sign-up and defaults to the account page", async () => {
    await signupGET(
      new NextRequest("https://jsquaredadventures.com/api/auth/signup"),
    );

    expect(getSignUpUrlMock).toHaveBeenCalledWith({
      returnTo: "/account",
      redirectUri: "https://jsquaredadventures.com/callback",
    });
  });

  it.each([
    "https://evil.example/account",
    "//evil.example/account",
    "/%2f%2fevil.example",
    "/callback",
  ])("drops the hostile return path %s", async (returnTo) => {
    await loginGET(
      new NextRequest(
        `https://jsquaredadventures.com/api/auth/login?returnTo=${encodeURIComponent(returnTo)}`,
      ),
    );

    expect(getSignInUrlMock).toHaveBeenCalledWith(
      expect.objectContaining({ returnTo: "/" }),
    );
  });
});

describe("WorkOS logout", () => {
  it("rejects cross-site logout attempts", async () => {
    const response = await logoutGET(
      new NextRequest("https://jsquaredadventures.com/api/auth/logout", {
        headers: {
          origin: "https://evil.example",
          "sec-fetch-site": "cross-site",
        },
      }),
    );

    expect((response as NextResponse).status).toBe(403);
    expect(signOutMock).not.toHaveBeenCalled();
  });

  it("signs out through AuthKit with a safe absolute public return URL", async () => {
    await logoutGET(
      new NextRequest(
        "https://jsquaredadventures.com/api/auth/logout?returnTo=/admin",
      ),
    );

    expect(signOutMock).toHaveBeenCalledWith({
      returnTo: "https://jsquaredadventures.com/",
    });
    expect(cookiesSetMock).toHaveBeenCalledWith(
      "j2-auth-return",
      "/admin",
      expect.objectContaining({
        httpOnly: true,
        sameSite: "lax",
        secure: true,
        path: "/",
        maxAge: 300,
      }),
    );
  });

  it("never returns to an attacker-controlled origin", async () => {
    await logoutGET(
      new NextRequest(
        "https://jsquaredadventures.com/api/auth/logout?returnTo=https%3A%2F%2Fevil.example",
      ),
    );

    expect(signOutMock).toHaveBeenCalledWith({
      returnTo: "https://jsquaredadventures.com/",
    });
    expect(cookiesSetMock).not.toHaveBeenCalled();
  });
});

describe("admin session introspection", () => {
  it("exposes the same token-free handler outside the Cloudflare Access admin path", () => {
    expect(publicSessionGET).toBe(adminSessionGET);
  });

  it("returns only the authorized admin display fields", async () => {
    requireAdminSessionMock.mockResolvedValue({
      user: {
        id: "local-admin",
        role: "admin",
        email: "admin@example.com",
        name: "Admin",
      },
      expires: "2026-11-25T00:00:00.000Z",
    });

    const response = await adminSessionGET();

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      session: {
        user: {
          id: "local-admin",
          role: "admin",
          email: "admin@example.com",
          name: "Admin",
        },
      },
    });
    expect(response.headers.get("Cache-Control")).toContain("no-store");
  });

  it("returns a null session for readers and anonymous requests", async () => {
    const response = await adminSessionGET();

    expect(await response.json()).toEqual({ session: null });
    expect(response.headers.get("Cache-Control")).toContain("no-store");
  });
});
