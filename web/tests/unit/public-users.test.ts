import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const {
  withAuthMock,
  resolveWorkosIdentityMock,
  captureExceptionMock,
  errorSpy,
} = vi.hoisted(() => ({
  withAuthMock: vi.fn(),
  resolveWorkosIdentityMock: vi.fn(),
  captureExceptionMock: vi.fn(),
  errorSpy: vi.fn(),
}));

vi.mock("@workos-inc/authkit-nextjs", () => ({
  withAuth: withAuthMock,
}));

vi.mock("@/server/auth/workos-identity", () => ({
  resolveWorkosIdentity: resolveWorkosIdentityMock,
  WorkosIdentityError: class WorkosIdentityError extends Error {
    constructor(readonly code: string) {
      super(`WorkOS identity could not be linked (${code})`);
      this.name = "WorkosIdentityError";
    }
  },
}));

vi.mock("@/lib/db", () => ({ getDb: vi.fn() }));

vi.mock("@/lib/env", () => ({
  getServerEnv: () => ({ ADMIN_ALLOWED_EMAILS: "admin@example.com" }),
}));

vi.mock("@/lib/sentry", () => ({
  captureException: captureExceptionMock,
}));

import { getRequestPublicUser } from "@/server/auth/public-users";

const verifiedUser = {
  id: "user_workos_reader",
  email: "reader@example.com",
  emailVerified: true,
  name: "Reader",
};

const mappedReader = {
  id: "local-reader",
  email: "reader@example.com",
  displayName: "Reader",
  avatarUrl: null,
};

describe("getRequestPublicUser", () => {
  beforeEach(() => {
    errorSpy.mockReset();
    vi.spyOn(console, "error").mockImplementation(errorSpy);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    withAuthMock.mockReset();
    resolveWorkosIdentityMock.mockReset();
    captureExceptionMock.mockReset();
  });

  it("maps a verified non-impersonated reader", async () => {
    withAuthMock.mockResolvedValue({ user: verifiedUser });
    resolveWorkosIdentityMock.mockResolvedValue(mappedReader);

    await expect(
      getRequestPublicUser(new Request("https://jsquaredadventures.com/")),
    ).resolves.toEqual(mappedReader);
  });

  it("denies an impersonation session before mapping any identity", async () => {
    withAuthMock.mockResolvedValue({
      user: verifiedUser,
      impersonator: { email: "operator@example.com", reason: "support" },
    });

    await expect(
      getRequestPublicUser(new Request("https://jsquaredadventures.com/")),
    ).resolves.toBeNull();
    expect(resolveWorkosIdentityMock).not.toHaveBeenCalled();
  });

  it("denies and logs only safe metadata when session verification fails", async () => {
    withAuthMock.mockRejectedValue(
      Object.assign(new Error("sealed session for reader@example.com"), {
        name: "SessionError",
        code: "ERR_SEALED_SESSION",
      }),
    );

    await expect(
      getRequestPublicUser(new Request("https://jsquaredadventures.com/")),
    ).resolves.toBeNull();

    expect(resolveWorkosIdentityMock).not.toHaveBeenCalled();
    expect(captureExceptionMock).toHaveBeenCalled();
    expect(errorSpy).toHaveBeenCalledWith(
      "[auth] public user session check failed",
      { errorName: "SessionError", errorCode: "ERR_SEALED_SESSION" },
    );
    const serialized = JSON.stringify(errorSpy.mock.calls);
    expect(serialized).not.toContain("reader@example.com");
    expect(serialized).not.toContain("sealed session");
  });

  it("denies and logs only safe metadata on an unexpected failure", async () => {
    withAuthMock.mockResolvedValue({ user: verifiedUser });
    const failure = Object.assign(
      new Error("token for reader@example.com is invalid"),
      { code: "ERR_TOKEN_LEAK" },
    );
    resolveWorkosIdentityMock.mockRejectedValue(failure);

    await expect(
      getRequestPublicUser(new Request("https://jsquaredadventures.com/")),
    ).resolves.toBeNull();

    expect(captureExceptionMock).toHaveBeenCalled();
    expect(errorSpy).toHaveBeenCalledWith(
      "[auth] public user resolution failed",
      { errorName: "Error", errorCode: "ERR_TOKEN_LEAK" },
    );
    const serialized = JSON.stringify(errorSpy.mock.calls);
    expect(serialized).not.toContain("reader@example.com");
    expect(serialized).not.toContain("token for");
  });
});
