import { describe, expect, it } from "vitest";

import { validateUploadedImage } from "@/lib/cloudinary/uploads";

describe("validateUploadedImage", () => {
  it("accepts a valid PNG signature", async () => {
    const pngBytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]);
    const file = new File([pngBytes], "photo.png", { type: "image/png" });

    await expect(
      validateUploadedImage(file, {
        allowedTypes: ["image/png", "image/jpeg", "image/webp", "image/gif"],
        maxBytes: 5 * 1024 * 1024,
      }),
    ).resolves.toBeUndefined();
  });

  it("rejects a spoofed PNG with non-image bytes", async () => {
    const file = new File([new Uint8Array([0x3c, 0x73, 0x76, 0x67, 0x3e])], "spoofed.png", {
      type: "image/png",
    });

    await expect(
      validateUploadedImage(file, {
        allowedTypes: ["image/png", "image/jpeg", "image/webp", "image/gif"],
        maxBytes: 5 * 1024 * 1024,
      }),
    ).rejects.toThrow("Uploaded file content does not match a supported image format");
  });
});
