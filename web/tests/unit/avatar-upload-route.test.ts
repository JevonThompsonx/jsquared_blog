import { afterEach, describe, expect, it, vi } from "vitest";
import { NextResponse } from "next/server";

vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: vi.fn(),
  getClientIp: vi.fn(() => "127.0.0.1"),
  tooManyRequests: vi.fn(() =>
    NextResponse.json({ error: "Too many requests" }, { status: 429 }),
  ),
}));

vi.mock("@/lib/media/local-storage", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/lib/media/local-storage")>();

  return {
    ...actual,
    saveLocalImage: vi.fn(),
  };
});

vi.mock("@/server/auth/public-users", () => ({
  getRequestPublicUser: vi.fn(),
}));

vi.mock("@/server/dal/profiles", () => ({
  getProfileByUserId: vi.fn().mockResolvedValue(null),
  updateProfileFields: vi.fn(),
}));

vi.mock("@/server/media/cleanup", () => ({
  deleteLocalMediaIfUnreferenced: vi.fn(),
}));

import { POST } from "@/app/api/account/avatar/route";
import { getRequestPublicUser } from "@/server/auth/public-users";
import { checkRateLimit } from "@/lib/rate-limit";
import { saveLocalImage } from "@/lib/media/local-storage";
import { updateProfileFields } from "@/server/dal/profiles";

function makePublicUser(id = "reader-1") {
  return {
    id,
    email: "reader@example.com",
    displayName: "Reader",
    avatarUrl: null,
  };
}

function makeUploadRequest(file: File): Request {
  const formData = new FormData();
  formData.append("file", file);

  return new Request("http://localhost/api/account/avatar", {
    method: "POST",
    body: formData,
  });
}

function makeInvalidFormDataRequest(): Request {
  return new Request("http://localhost/api/account/avatar", {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({ file: "nope" }),
  });
}

function makeMissingFileRequest(): Request {
  return new Request("http://localhost/api/account/avatar", {
    method: "POST",
    body: new FormData(),
  });
}

describe("POST /api/account/avatar", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when unauthenticated", async () => {
    vi.mocked(getRequestPublicUser).mockResolvedValue(null);

    const response = await POST(makeMissingFileRequest());

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "Unauthorized" });
    expect(vi.mocked(checkRateLimit)).not.toHaveBeenCalled();
  });

  it("returns the throttled response when rate limited", async () => {
    vi.mocked(getRequestPublicUser).mockResolvedValue(makePublicUser());
    vi.mocked(checkRateLimit).mockResolvedValue({
      allowed: false,
      limit: 10,
      remaining: 0,
      resetAt: Date.now() + 60_000,
    });

    const response = await POST(makeMissingFileRequest());

    expect(response.status).toBe(429);
    expect(await response.json()).toEqual({ error: "Too many requests" });
    expect(vi.mocked(saveLocalImage)).not.toHaveBeenCalled();
  });

  it("rejects invalid form data", async () => {
    vi.mocked(getRequestPublicUser).mockResolvedValue(makePublicUser());
    vi.mocked(checkRateLimit).mockResolvedValue({
      allowed: true,
      limit: 10,
      remaining: 9,
      resetAt: Date.now() + 60_000,
    });

    const response = await POST(makeInvalidFormDataRequest());

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "Invalid form data" });
  });

  it("requires an uploaded image file", async () => {
    vi.mocked(getRequestPublicUser).mockResolvedValue(makePublicUser());
    vi.mocked(checkRateLimit).mockResolvedValue({
      allowed: true,
      limit: 10,
      remaining: 9,
      resetAt: Date.now() + 60_000,
    });

    const response = await POST(makeMissingFileRequest());

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "Image file is required" });
    expect(vi.mocked(saveLocalImage)).not.toHaveBeenCalled();
  });

  it("rejects spoofed image files before upload", async () => {
    vi.mocked(getRequestPublicUser).mockResolvedValue(makePublicUser());
    vi.mocked(checkRateLimit).mockResolvedValue({
      allowed: true,
      limit: 10,
      remaining: 9,
      resetAt: Date.now() + 60_000,
    });

    const spoofedFile = new File(
      [new Uint8Array([0x3c, 0x68, 0x74, 0x6d, 0x6c])],
      "avatar.png",
      {
        type: "image/png",
      },
    );

    const response = await POST(makeUploadRequest(spoofedFile));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: "Uploaded file content does not match a supported image format",
    });
    expect(vi.mocked(saveLocalImage)).not.toHaveBeenCalled();
    expect(vi.mocked(updateProfileFields)).not.toHaveBeenCalled();
  });

  it("returns 503 when the upload service is unavailable", async () => {
    vi.mocked(getRequestPublicUser).mockResolvedValue(makePublicUser());
    vi.mocked(checkRateLimit).mockResolvedValue({
      allowed: true,
      limit: 10,
      remaining: 9,
      resetAt: Date.now() + 60_000,
    });

    const validPng = new File(
      [new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])],
      "avatar.png",
      {
        type: "image/png",
      },
    );

    vi.mocked(saveLocalImage).mockRejectedValue(
      Object.assign(new Error("write failed"), { code: "ENOSPC" }),
    );

    const response = await POST(makeUploadRequest(validPng));

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({
      error: "Upload service unavailable",
    });
    expect(vi.mocked(updateProfileFields)).not.toHaveBeenCalled();
  });

  it("returns a safe generic error when upload fails unexpectedly", async () => {
    vi.mocked(getRequestPublicUser).mockResolvedValue(makePublicUser());
    vi.mocked(checkRateLimit).mockResolvedValue({
      allowed: true,
      limit: 10,
      remaining: 9,
      resetAt: Date.now() + 60_000,
    });

    const validPng = new File(
      [new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])],
      "avatar.png",
      {
        type: "image/png",
      },
    );

    vi.mocked(saveLocalImage).mockRejectedValue(new Error("provider timeout"));

    const response = await POST(makeUploadRequest(validPng));

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: "Upload failed" });
    expect(vi.mocked(updateProfileFields)).not.toHaveBeenCalled();
  });
});
