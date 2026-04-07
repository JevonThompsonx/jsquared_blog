import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn((location: string) => {
    throw new Error(`NEXT_REDIRECT:${location}`);
  }),
}));

vi.mock("@/lib/auth/session", () => ({
  requireAdminSession: vi.fn(),
}));

vi.mock("@/server/dal/admin-wishlist-places", () => ({
  createAdminWishlistPlace: vi.fn(),
}));

import { revalidatePath } from "next/cache";

import type { AdminSession } from "@/lib/auth/session";
import { requireAdminSession } from "@/lib/auth/session";
import { createWishlistPlaceAction } from "@/app/admin/wishlist/actions";
import { createAdminWishlistPlace } from "@/server/dal/admin-wishlist-places";

const ADMIN_SESSION: AdminSession = {
  user: { id: "admin-1", role: "admin" },
  expires: "2099-01-01T00:00:00.000Z",
};

function makeFormData(values: Record<string, string | boolean | undefined>): FormData {
  const formData = new FormData();

  for (const [key, value] of Object.entries(values)) {
    if (value === undefined) {
      continue;
    }

    if (typeof value === "boolean") {
      if (value) {
        formData.set(key, "on");
      }
      continue;
    }

    formData.set(key, value);
  }

  return formData;
}

describe("createWishlistPlaceAction", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("redirects unauthenticated callers to the admin sign-in gate", async () => {
    vi.mocked(requireAdminSession).mockResolvedValue(null);

    await expect(
      createWishlistPlaceAction(
        makeFormData({
          name: "Glacier National Park",
          locationName: "West Glacier, Montana",
          latitude: "48.7596",
          longitude: "-113.7870",
        }),
      ),
    ).rejects.toThrow("NEXT_REDIRECT:/admin?error=AccessDenied");

    expect(vi.mocked(createAdminWishlistPlace)).not.toHaveBeenCalled();
  });

  it("does not persist invalid payloads", async () => {
    vi.mocked(requireAdminSession).mockResolvedValue(ADMIN_SESSION);

    await createWishlistPlaceAction(
      makeFormData({
        name: "Glacier National Park",
        locationName: "West Glacier, Montana",
        latitude: "   ",
        longitude: "-113.7870",
      }),
    );

    expect(vi.mocked(createAdminWishlistPlace)).not.toHaveBeenCalled();
    expect(vi.mocked(revalidatePath)).not.toHaveBeenCalled();
  });

  it("passes normalized validated data to the DAL and revalidates admin wishlist", async () => {
    vi.mocked(requireAdminSession).mockResolvedValue(ADMIN_SESSION);

    await createWishlistPlaceAction(
      makeFormData({
        name: "  Glacier National Park  ",
        locationName: "  West Glacier, Montana  ",
        latitude: "48.7596",
        longitude: "-113.7870",
        zoom: "9",
        sortOrder: "3",
        visited: true,
        isPublic: true,
        externalUrl: "https://example.com/glacier",
      }),
    );

    expect(vi.mocked(createAdminWishlistPlace)).toHaveBeenCalledWith({
      name: "Glacier National Park",
      locationName: "West Glacier, Montana",
      latitude: 48.7596,
      longitude: -113.787,
      zoom: 9,
      sortOrder: 3,
      visited: true,
      isPublic: true,
      externalUrl: "https://example.com/glacier",
      createdByUserId: "admin-1",
    });
    expect(vi.mocked(revalidatePath)).toHaveBeenCalledWith("/admin/wishlist");
  });
});
