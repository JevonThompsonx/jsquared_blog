import { describe, expect, it } from "vitest";

import { patchProfileSchema } from "@/server/forms/profile";

function parseAvatar(avatarUrl: unknown) {
  return patchProfileSchema.safeParse({ avatarUrl });
}

describe("patchProfileSchema avatar allowlist", () => {
  it("accepts preset ids", () => {
    expect(parseAvatar("j2:mountain").success).toBe(true);
  });

  it("accepts local media and GitHub avatar URLs", () => {
    expect(parseAvatar("/media/avatars/2026/11/hash-me.webp").success).toBe(
      true,
    );
    expect(
      parseAvatar("https://avatars.githubusercontent.com/u/104575457").success,
    ).toBe(true);
  });

  it("rejects retired remote avatar hosts", () => {
    expect(
      parseAvatar("https://res.cloudinary.com/demo/image/upload/v1/avatar.jpg")
        .success,
    ).toBe(false);
    expect(
      parseAvatar("https://abcxyz.supabase.co/storage/v1/object/public/a.png")
        .success,
    ).toBe(false);
  });

  it("rejects an arbitrary host that would crash next/image", () => {
    expect(parseAvatar("https://evil.example/x.png").success).toBe(false);
  });

  it("rejects non-http protocols", () => {
    expect(parseAvatar("javascript:alert(1)").success).toBe(false);
    expect(parseAvatar("data:image/svg+xml,<svg/>").success).toBe(false);
  });

  it("keeps blank and null values as cleared avatars", () => {
    expect(parseAvatar("").success).toBe(true);
    expect(parseAvatar(null).success).toBe(true);
  });
});
