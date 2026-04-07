import type { AdminSession } from "@/lib/auth/session";

import { afterEach, describe, expect, it, vi } from "vitest";
import { NextResponse } from "next/server";

vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: vi.fn(),
  getClientIp: vi.fn(() => "127.0.0.1"),
  tooManyRequests: vi.fn(() => NextResponse.json({ error: "Too many requests" }, { status: 429 })),
}));

vi.mock("@/lib/auth/session", () => ({
  requireAdminSession: vi.fn(),
}));

vi.mock("@/lib/cloudinary/uploads", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/cloudinary/uploads")>();

  return {
    ...actual,
    uploadEditorialImage: vi.fn(),
  };
});

import { POST } from "@/app/api/admin/uploads/images/route";
import { requireAdminSession } from "@/lib/auth/session";
import { checkRateLimit } from "@/lib/rate-limit";
import { uploadEditorialImage } from "@/lib/cloudinary/uploads";

function makeAdminSession(): AdminSession {
  return {
    expires: "2099-01-01T00:00:00.000Z",
    user: {
      id: "admin-1",
      role: "admin",
    },
  };
}

function makeUploadRequest(file: File): Request {
  const formData = new FormData();
  formData.append("file", file);

  return new Request("http://localhost/api/admin/uploads/images", {
    method: "POST",
    body: formData,
  });
}

describe("POST /api/admin/uploads/images", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("rejects spoofed image files before upload", async () => {
    vi.mocked(requireAdminSession).mockResolvedValue(makeAdminSession());
    vi.mocked(checkRateLimit).mockResolvedValue({
      allowed: true,
      limit: 20,
      remaining: 19,
      resetAt: Date.now() + 60_000,
    });

    const spoofedFile = new File([new Uint8Array([0x6e, 0x6f, 0x74, 0x2d, 0x69, 0x6d, 0x67])], "editorial.webp", {
      type: "image/webp",
    });

    const response = await POST(makeUploadRequest(spoofedFile));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "Uploaded file content does not match a supported image format" });
    expect(vi.mocked(uploadEditorialImage)).not.toHaveBeenCalled();
  });
});
