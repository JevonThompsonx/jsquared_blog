import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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
  deleteAdminWishlistPlace: vi.fn(),
  updateAdminWishlistPlace: vi.fn(),
}));

import { revalidatePath } from "next/cache";

import type { AdminSession } from "@/lib/auth/session";
import { requireAdminSession } from "@/lib/auth/session";
import {
  createWishlistPlaceAction,
  deleteWishlistPlaceAction,
  updateWishlistPlaceAction,
} from "@/app/admin/wishlist/actions";
import {
  createAdminWishlistPlace,
  deleteAdminWishlistPlace,
  updateAdminWishlistPlace,
} from "@/server/dal/admin-wishlist-places";

function makeValidWishlistPlaceFields(
  overrides: Record<string, string | boolean | undefined> = {},
): Record<string, string | boolean | undefined> {
  return {
    name: "Glacier National Park",
    locationName: "West Glacier, Montana",
    latitude: "48.7596",
    longitude: "-113.7870",
    zoom: "8",
    sortOrder: "0",
    externalUrl: "",
    ...overrides,
  };
}

const ADMIN_SESSION: AdminSession = {
  user: { id: "admin-1", role: "admin" },
  expires: "2099-01-01T00:00:00.000Z",
};

const NON_ADMIN_SESSION: AdminSession = {
  user: { id: "reader-1", role: "reader" },
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

describe("wishlist admin actions", () => {
  afterEach(() => {
    vi.resetAllMocks();
    vi.restoreAllMocks();
  });

  beforeEach(() => {
    vi.mocked(revalidatePath).mockImplementation(() => undefined);
    vi.mocked(createAdminWishlistPlace).mockResolvedValue(undefined);
    vi.mocked(updateAdminWishlistPlace).mockResolvedValue(undefined);
    vi.mocked(deleteAdminWishlistPlace).mockResolvedValue(undefined);
  });

  it("redirects unauthenticated callers to the admin sign-in gate", async () => {
    vi.mocked(requireAdminSession).mockResolvedValue(null);

    await expect(
      createWishlistPlaceAction(
        makeFormData({
          ...makeValidWishlistPlaceFields(),
        }),
      ),
    ).rejects.toThrow("NEXT_REDIRECT:/admin?error=AccessDenied");

    expect(vi.mocked(createAdminWishlistPlace)).not.toHaveBeenCalled();
  });

  it("redirects non-admin callers away from wishlist mutations", async () => {
    vi.mocked(requireAdminSession).mockResolvedValue(NON_ADMIN_SESSION);

    await expect(
      createWishlistPlaceAction(
        makeFormData({
          ...makeValidWishlistPlaceFields(),
        }),
      ),
    ).rejects.toThrow("NEXT_REDIRECT:/admin?error=AccessDenied");

    expect(vi.mocked(createAdminWishlistPlace)).not.toHaveBeenCalled();
  });

  it("does not persist invalid payloads", async () => {
    vi.mocked(requireAdminSession).mockResolvedValue(ADMIN_SESSION);

    await createWishlistPlaceAction(
      makeFormData({
        ...makeValidWishlistPlaceFields({
          latitude: "   ",
        }),
      }),
    );

    expect(vi.mocked(createAdminWishlistPlace)).not.toHaveBeenCalled();
    expect(vi.mocked(revalidatePath)).not.toHaveBeenCalled();
  });

  it("passes normalized validated data to the DAL and revalidates admin wishlist", async () => {
    vi.mocked(requireAdminSession).mockResolvedValue(ADMIN_SESSION);

    await createWishlistPlaceAction(
      makeFormData({
        ...makeValidWishlistPlaceFields({
          name: "  Glacier National Park  ",
          locationName: "  West Glacier, Montana  ",
          zoom: "9",
          sortOrder: "3",
          visited: true,
          isPublic: true,
          externalUrl: "https://example.com/glacier",
        }),
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

  it("returns a generic save failure when wishlist creation throws after validation", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);

    vi.mocked(requireAdminSession).mockResolvedValue(ADMIN_SESSION);
    vi.mocked(createAdminWishlistPlace).mockRejectedValue(new Error("database unavailable"));

    await expect(
      createWishlistPlaceAction(
        makeFormData({
          ...makeValidWishlistPlaceFields(),
        }),
      ),
    ).rejects.toThrow("Failed to save wishlist destination");

    expect(consoleErrorSpy).toHaveBeenCalledOnce();
    expect(vi.mocked(revalidatePath)).not.toHaveBeenCalled();
  });

  it("does not fail a successful wishlist creation when revalidation throws", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);

    vi.mocked(requireAdminSession).mockResolvedValue(ADMIN_SESSION);
    vi.mocked(revalidatePath).mockImplementation(() => {
      throw new Error("revalidation failed");
    });

    await expect(
      createWishlistPlaceAction(
        makeFormData({
          ...makeValidWishlistPlaceFields(),
        }),
      ),
    ).resolves.toBeUndefined();

    expect(vi.mocked(createAdminWishlistPlace)).toHaveBeenCalledOnce();
    expect(consoleErrorSpy).toHaveBeenCalledOnce();
  });

  it("updates an existing wishlist place with normalized validated data", async () => {
    vi.mocked(requireAdminSession).mockResolvedValue(ADMIN_SESSION);

    await updateWishlistPlaceAction(
      makeFormData({
        ...makeValidWishlistPlaceFields({
          id: "550e8400-e29b-41d4-a716-446655440000",
          name: "  Glacier National Park  ",
          locationName: "  West Glacier, Montana  ",
          zoom: "10",
          sortOrder: "4",
          visited: true,
          isPublic: true,
          externalUrl: "https://example.com/updated-glacier",
        }),
      }),
    );

    expect(vi.mocked(updateAdminWishlistPlace)).toHaveBeenCalledWith({
      id: "550e8400-e29b-41d4-a716-446655440000",
      name: "Glacier National Park",
      locationName: "West Glacier, Montana",
      latitude: 48.7596,
      longitude: -113.787,
      zoom: 10,
      sortOrder: 4,
      visited: true,
      isPublic: true,
      externalUrl: "https://example.com/updated-glacier",
    });
    expect(vi.mocked(revalidatePath)).toHaveBeenCalledWith("/admin/wishlist");
  });

  it("redirects unauthenticated callers away from wishlist updates", async () => {
    vi.mocked(requireAdminSession).mockResolvedValue(null);

    await expect(
      updateWishlistPlaceAction(
        makeFormData({
          ...makeValidWishlistPlaceFields({
            id: "550e8400-e29b-41d4-a716-446655440000",
          }),
        }),
      ),
    ).rejects.toThrow("NEXT_REDIRECT:/admin?error=AccessDenied");

    expect(vi.mocked(updateAdminWishlistPlace)).not.toHaveBeenCalled();
  });

  it("redirects non-admin callers away from wishlist updates", async () => {
    vi.mocked(requireAdminSession).mockResolvedValue(NON_ADMIN_SESSION);

    await expect(
      updateWishlistPlaceAction(
        makeFormData({
          ...makeValidWishlistPlaceFields({
            id: "550e8400-e29b-41d4-a716-446655440000",
          }),
        }),
      ),
    ).rejects.toThrow("NEXT_REDIRECT:/admin?error=AccessDenied");

    expect(vi.mocked(updateAdminWishlistPlace)).not.toHaveBeenCalled();
  });

  it("returns a generic save failure when wishlist updates throw after validation", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);

    vi.mocked(requireAdminSession).mockResolvedValue(ADMIN_SESSION);
    vi.mocked(updateAdminWishlistPlace).mockRejectedValue(new Error("database unavailable"));

    await expect(
      updateWishlistPlaceAction(
        makeFormData({
          ...makeValidWishlistPlaceFields({
            id: "550e8400-e29b-41d4-a716-446655440000",
          }),
        }),
      ),
    ).rejects.toThrow("Failed to save wishlist destination");

    expect(consoleErrorSpy).toHaveBeenCalledOnce();
    expect(vi.mocked(revalidatePath)).not.toHaveBeenCalled();
  });

  it("does not fail a successful wishlist update when revalidation throws", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);

    vi.mocked(requireAdminSession).mockResolvedValue(ADMIN_SESSION);
    vi.mocked(revalidatePath).mockImplementation(() => {
      throw new Error("revalidation failed");
    });

    await expect(
      updateWishlistPlaceAction(
        makeFormData({
          ...makeValidWishlistPlaceFields({
            id: "550e8400-e29b-41d4-a716-446655440000",
          }),
        }),
      ),
    ).resolves.toBeUndefined();

    expect(vi.mocked(updateAdminWishlistPlace)).toHaveBeenCalledOnce();
    expect(consoleErrorSpy).toHaveBeenCalledOnce();
  });

  it("does not update when the wishlist place id is blank", async () => {
    vi.mocked(requireAdminSession).mockResolvedValue(ADMIN_SESSION);

    await updateWishlistPlaceAction(
      makeFormData({
        ...makeValidWishlistPlaceFields({
          id: "   ",
        }),
      }),
    );

    expect(vi.mocked(updateAdminWishlistPlace)).not.toHaveBeenCalled();
    expect(vi.mocked(revalidatePath)).not.toHaveBeenCalled();
  });

  it("deletes a wishlist place when the id is valid", async () => {
    vi.mocked(requireAdminSession).mockResolvedValue(ADMIN_SESSION);

    await deleteWishlistPlaceAction(
      makeFormData({
        id: "550e8400-e29b-41d4-a716-446655440000",
      }),
    );

    expect(vi.mocked(deleteAdminWishlistPlace)).toHaveBeenCalledWith("550e8400-e29b-41d4-a716-446655440000");
    expect(vi.mocked(revalidatePath)).toHaveBeenCalledWith("/admin/wishlist");
  });

  it("redirects unauthenticated callers away from wishlist deletions", async () => {
    vi.mocked(requireAdminSession).mockResolvedValue(null);

    await expect(
      deleteWishlistPlaceAction(
        makeFormData({
          id: "550e8400-e29b-41d4-a716-446655440000",
        }),
      ),
    ).rejects.toThrow("NEXT_REDIRECT:/admin?error=AccessDenied");

    expect(vi.mocked(deleteAdminWishlistPlace)).not.toHaveBeenCalled();
  });

  it("redirects non-admin callers away from wishlist deletions", async () => {
    vi.mocked(requireAdminSession).mockResolvedValue(NON_ADMIN_SESSION);

    await expect(
      deleteWishlistPlaceAction(
        makeFormData({
          id: "550e8400-e29b-41d4-a716-446655440000",
        }),
      ),
    ).rejects.toThrow("NEXT_REDIRECT:/admin?error=AccessDenied");

    expect(vi.mocked(deleteAdminWishlistPlace)).not.toHaveBeenCalled();
  });

  it("returns a generic delete failure when wishlist deletion throws after validation", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);

    vi.mocked(requireAdminSession).mockResolvedValue(ADMIN_SESSION);
    vi.mocked(deleteAdminWishlistPlace).mockRejectedValue(new Error("database unavailable"));

    await expect(
      deleteWishlistPlaceAction(
        makeFormData({
          id: "550e8400-e29b-41d4-a716-446655440000",
        }),
      ),
    ).rejects.toThrow("Failed to delete wishlist destination");

    expect(consoleErrorSpy).toHaveBeenCalledOnce();
    expect(vi.mocked(revalidatePath)).not.toHaveBeenCalled();
  });

  it("does not fail a successful wishlist deletion when revalidation throws", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);

    vi.mocked(requireAdminSession).mockResolvedValue(ADMIN_SESSION);
    vi.mocked(revalidatePath).mockImplementation(() => {
      throw new Error("revalidation failed");
    });

    await expect(
      deleteWishlistPlaceAction(
        makeFormData({
          id: "550e8400-e29b-41d4-a716-446655440000",
        }),
      ),
    ).resolves.toBeUndefined();

    expect(vi.mocked(deleteAdminWishlistPlace)).toHaveBeenCalledOnce();
    expect(consoleErrorSpy).toHaveBeenCalledOnce();
  });

  it("does not delete a wishlist place when the id is blank", async () => {
    vi.mocked(requireAdminSession).mockResolvedValue(ADMIN_SESSION);

    await deleteWishlistPlaceAction(
      makeFormData({
        id: "   ",
      }),
    );

    expect(vi.mocked(deleteAdminWishlistPlace)).not.toHaveBeenCalled();
    expect(vi.mocked(revalidatePath)).not.toHaveBeenCalled();
  });
});
