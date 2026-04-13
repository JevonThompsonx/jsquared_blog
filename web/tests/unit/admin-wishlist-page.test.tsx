import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";

const redirectError = new Error("NEXT_REDIRECT");

vi.mock("next/navigation", () => ({
  redirect: vi.fn(() => {
    throw redirectError;
  }),
}));

vi.mock("next/link", () => ({
  default: ({ children }: { children: unknown }) => children,
}));

vi.mock("@/components/layout/site-header", () => ({
  SiteHeader: () => null,
}));

vi.mock("@/lib/auth/session", () => ({
  requireAdminSession: vi.fn(),
}));

vi.mock("@/server/dal/admin-wishlist-places", () => ({
  listAdminWishlistPlaces: vi.fn(),
}));

vi.mock("@/app/admin/wishlist/actions", () => ({
  createWishlistPlaceAction: vi.fn(),
  updateWishlistPlaceAction: vi.fn(),
  deleteWishlistPlaceAction: vi.fn(),
  checkOffWishlistPlaceAction: vi.fn(),
}));

vi.mock("@/components/admin/wishlist-location-autocomplete", () => ({
  WishlistLocationAutocomplete: () => null,
}));

import AdminWishlistPage from "@/app/admin/wishlist/page";
import { requireAdminSession } from "@/lib/auth/session";
import { listAdminWishlistPlaces } from "@/server/dal/admin-wishlist-places";
import { redirect } from "next/navigation";

describe("AdminWishlistPage", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("redirects unauthenticated visitors before loading wishlist data", async () => {
    vi.mocked(requireAdminSession).mockResolvedValue(null);

    await expect(AdminWishlistPage()).rejects.toThrow(redirectError);

    expect(redirect).toHaveBeenCalledWith("/admin");
    expect(listAdminWishlistPlaces).not.toHaveBeenCalled();
  });

  it("redirects non-admin visitors before loading wishlist data", async () => {
    vi.mocked(requireAdminSession).mockResolvedValue({ user: { id: "reader-1", role: "reader" } } as never);

    await expect(AdminWishlistPage()).rejects.toThrow(redirectError);

    expect(redirect).toHaveBeenCalledWith("/admin");
    expect(listAdminWishlistPlaces).not.toHaveBeenCalled();
  });

  it("renders the wishlist management shell for admins", async () => {
    vi.mocked(requireAdminSession).mockResolvedValue({ user: { id: "admin-1", role: "admin" } } as never);
    vi.mocked(listAdminWishlistPlaces).mockResolvedValue([
      {
        id: "place-1",
        name: "Glacier National Park",
        locationName: "West Glacier, Montana",
        locationLat: 48.7596,
        locationLng: -113.787,
        locationZoom: 8,
        sortOrder: 3,
        externalUrl: "https://example.com/glacier",
        visited: true,
        isPublic: true,
      },
    ] as never);

    const markup = renderToStaticMarkup(await AdminWishlistPage());

    expect(markup).toContain("Travel wishlist");
    expect(markup).toContain("Glacier National Park");
    expect(markup).toContain("Open link");
    expect(markup).toContain("admin-wishlist-create-form");
    expect(markup).toContain("admin-wishlist-update-form");
    expect(markup).toContain("admin-wishlist-delete-form");
    expect(markup).toContain('<input type="checkbox" name="isPublic" checked=""');
  });
});
