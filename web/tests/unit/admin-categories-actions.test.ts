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

vi.mock("@/server/dal/categories", () => ({
  createCategory: vi.fn(),
  deleteCategory: vi.fn(),
  updateCategory: vi.fn(),
  CategoryInUseError: class extends Error {
    constructor(public readonly categoryId: string, public readonly postCount: number) {
      super(`Category ${categoryId} still has ${postCount} post(s) attached`);
      this.name = "CategoryInUseError";
    }
  },
  CategorySlugConflictError: class extends Error {
    constructor(public readonly slug: string) {
      super(`A category with slug ${slug} already exists`);
      this.name = "CategorySlugConflictError";
    }
  },
}));

import { revalidatePath } from "next/cache";
import type { AdminSession } from "@/lib/auth/session";
import { requireAdminSession } from "@/lib/auth/session";
import {
  CategoryInUseError,
  CategorySlugConflictError,
  createCategory,
  deleteCategory,
  updateCategory,
} from "@/server/dal/categories";

import {
  createCategoryAction,
  deleteCategoryAction,
  updateCategoryAction,
} from "@/app/admin/categories/actions";

const ADMIN_SESSION: AdminSession = {
  user: { id: "admin-1", role: "admin" },
  expires: "2099-01-01T00:00:00.000Z",
};

const NON_ADMIN_SESSION: AdminSession = {
  user: { id: "author-1", role: "author" },
  expires: "2099-01-01T00:00:00.000Z",
};

function makeFormData(values: Record<string, string>): FormData {
  const formData = new FormData();
  for (const [key, value] of Object.entries(values)) {
    formData.set(key, value);
  }
  return formData;
}

describe("createCategoryAction", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("redirects unauthenticated callers to the admin sign-in gate", async () => {
    vi.mocked(requireAdminSession).mockResolvedValue(null);

    await expect(
      createCategoryAction(makeFormData({ name: "Roads" })),
    ).rejects.toThrow("NEXT_REDIRECT:/admin?error=AccessDenied");

    expect(vi.mocked(createCategory)).not.toHaveBeenCalled();
  });

  it("redirects non-admin callers to the admin sign-in gate", async () => {
    vi.mocked(requireAdminSession).mockResolvedValue(NON_ADMIN_SESSION);

    await expect(
      createCategoryAction(makeFormData({ name: "Roads" })),
    ).rejects.toThrow("NEXT_REDIRECT:/admin?error=AccessDenied");

    expect(vi.mocked(createCategory)).not.toHaveBeenCalled();
  });

  it("redirects to InvalidCategory when the payload is invalid", async () => {
    vi.mocked(requireAdminSession).mockResolvedValue(ADMIN_SESSION);

    await expect(createCategoryAction(makeFormData({}))).rejects.toThrow(
      "NEXT_REDIRECT:/admin/categories?error=InvalidCategory",
    );

    expect(vi.mocked(createCategory)).not.toHaveBeenCalled();
  });

  it("rejects blank category names via redirect", async () => {
    vi.mocked(requireAdminSession).mockResolvedValue(ADMIN_SESSION);

    await expect(
      createCategoryAction(makeFormData({ name: "   " })),
    ).rejects.toThrow("NEXT_REDIRECT:/admin/categories?error=InvalidCategory");
  });

  it("persists a valid category and revalidates affected paths", async () => {
    vi.mocked(requireAdminSession).mockResolvedValue(ADMIN_SESSION);
    vi.mocked(createCategory).mockResolvedValue({
      id: "category-roads",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await createCategoryAction(
      makeFormData({ name: "Roads", slug: "roads", description: "On the road" }),
    );

    expect(vi.mocked(createCategory)).toHaveBeenCalledWith({
      name: "Roads",
      slug: "roads",
      description: "On the road",
    });
    expect(vi.mocked(revalidatePath)).toHaveBeenCalledWith("/admin/categories");
    expect(vi.mocked(revalidatePath)).toHaveBeenCalledWith("/categories");
  });

  it("redirects with SlugTaken when the DAL throws CategorySlugConflictError", async () => {
    vi.mocked(requireAdminSession).mockResolvedValue(ADMIN_SESSION);
    vi.mocked(createCategory).mockRejectedValue(new CategorySlugConflictError("roads"));

    await expect(
      createCategoryAction(makeFormData({ name: "Roads" })),
    ).rejects.toThrow("NEXT_REDIRECT:/admin/categories?error=SlugTaken&slug=roads");

    expect(vi.mocked(revalidatePath)).not.toHaveBeenCalled();
  });

  it("surfaces a generic error when the DAL fails for an unknown reason", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    vi.mocked(requireAdminSession).mockResolvedValue(ADMIN_SESSION);
    vi.mocked(createCategory).mockRejectedValue(new Error("database unavailable"));

    await expect(
      createCategoryAction(makeFormData({ name: "Roads" })),
    ).rejects.toThrow("Failed to save category");

    expect(consoleErrorSpy).toHaveBeenCalled();
    expect(vi.mocked(revalidatePath)).not.toHaveBeenCalled();
  });
});

describe("updateCategoryAction", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("redirects unauthenticated callers to the admin sign-in gate", async () => {
    vi.mocked(requireAdminSession).mockResolvedValue(null);

    await expect(
      updateCategoryAction(makeFormData({ id: "category-1", name: "Roads" })),
    ).rejects.toThrow("NEXT_REDIRECT:/admin?error=AccessDenied");

    expect(vi.mocked(updateCategory)).not.toHaveBeenCalled();
  });

  it("redirects non-admin callers to the admin sign-in gate", async () => {
    vi.mocked(requireAdminSession).mockResolvedValue(NON_ADMIN_SESSION);

    await expect(
      updateCategoryAction(makeFormData({ id: "category-1", name: "Roads" })),
    ).rejects.toThrow("NEXT_REDIRECT:/admin?error=AccessDenied");

    expect(vi.mocked(updateCategory)).not.toHaveBeenCalled();
  });

  it("rejects payloads missing the id", async () => {
    vi.mocked(requireAdminSession).mockResolvedValue(ADMIN_SESSION);

    await expect(
      updateCategoryAction(makeFormData({ name: "Roads" })),
    ).rejects.toThrow("NEXT_REDIRECT:/admin/categories?error=InvalidCategory");

    expect(vi.mocked(updateCategory)).not.toHaveBeenCalled();
  });

  it("rejects payloads with a blank name", async () => {
    vi.mocked(requireAdminSession).mockResolvedValue(ADMIN_SESSION);

    await expect(
      updateCategoryAction(makeFormData({ id: "category-1", name: "   " })),
    ).rejects.toThrow("NEXT_REDIRECT:/admin/categories?error=InvalidCategory");
  });

  it("persists a valid update and revalidates", async () => {
    vi.mocked(requireAdminSession).mockResolvedValue(ADMIN_SESSION);
    vi.mocked(updateCategory).mockResolvedValue({
      id: "category-1",
      updatedAt: new Date(),
    });

    await updateCategoryAction(
      makeFormData({ id: "category-1", name: "Roads Renamed", slug: "roads-renamed" }),
    );

    expect(vi.mocked(updateCategory)).toHaveBeenCalledWith({
      id: "category-1",
      name: "Roads Renamed",
      slug: "roads-renamed",
      description: null,
    });
    expect(vi.mocked(revalidatePath)).toHaveBeenCalledWith("/admin/categories");
    expect(vi.mocked(revalidatePath)).toHaveBeenCalledWith("/categories");
  });

  it("redirects with SlugTaken when the DAL throws CategorySlugConflictError", async () => {
    vi.mocked(requireAdminSession).mockResolvedValue(ADMIN_SESSION);
    vi.mocked(updateCategory).mockRejectedValue(new CategorySlugConflictError("roads"));

    await expect(
      updateCategoryAction(makeFormData({ id: "category-1", name: "Roads" })),
    ).rejects.toThrow(
      "NEXT_REDIRECT:/admin/categories?error=SlugTaken&slug=roads&id=category-1",
    );
  });

  it("surfaces a generic error when the DAL fails for an unknown reason", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    vi.mocked(requireAdminSession).mockResolvedValue(ADMIN_SESSION);
    vi.mocked(updateCategory).mockRejectedValue(new Error("database unavailable"));

    await expect(
      updateCategoryAction(makeFormData({ id: "category-1", name: "Roads" })),
    ).rejects.toThrow("Failed to save category");

    expect(consoleErrorSpy).toHaveBeenCalled();
  });
});

describe("deleteCategoryAction", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("redirects unauthenticated callers to the admin sign-in gate", async () => {
    vi.mocked(requireAdminSession).mockResolvedValue(null);

    await expect(
      deleteCategoryAction(makeFormData({ id: "category-1" })),
    ).rejects.toThrow("NEXT_REDIRECT:/admin?error=AccessDenied");

    expect(vi.mocked(deleteCategory)).not.toHaveBeenCalled();
  });

  it("rejects payloads missing the id", async () => {
    vi.mocked(requireAdminSession).mockResolvedValue(ADMIN_SESSION);

    await expect(
      deleteCategoryAction(makeFormData({})),
    ).rejects.toThrow("NEXT_REDIRECT:/admin/categories?error=InvalidCategory");

    expect(vi.mocked(deleteCategory)).not.toHaveBeenCalled();
  });

  it("deletes a valid category and revalidates", async () => {
    vi.mocked(requireAdminSession).mockResolvedValue(ADMIN_SESSION);
    vi.mocked(deleteCategory).mockResolvedValue({ id: "category-1" });

    await deleteCategoryAction(makeFormData({ id: "category-1" }));

    expect(vi.mocked(deleteCategory)).toHaveBeenCalledWith("category-1");
    expect(vi.mocked(revalidatePath)).toHaveBeenCalledWith("/admin/categories");
    expect(vi.mocked(revalidatePath)).toHaveBeenCalledWith("/categories");
  });

  it("redirects with CategoryInUse when posts reference the category", async () => {
    vi.mocked(requireAdminSession).mockResolvedValue(ADMIN_SESSION);
    vi.mocked(deleteCategory).mockRejectedValue(new CategoryInUseError("category-1", 4));

    await expect(
      deleteCategoryAction(makeFormData({ id: "category-1" })),
    ).rejects.toThrow(
      "NEXT_REDIRECT:/admin/categories?error=CategoryInUse&posts=4&id=category-1",
    );
  });

  it("surfaces a generic error when the DAL fails for an unknown reason", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    vi.mocked(requireAdminSession).mockResolvedValue(ADMIN_SESSION);
    vi.mocked(deleteCategory).mockRejectedValue(new Error("database unavailable"));

    await expect(
      deleteCategoryAction(makeFormData({ id: "category-1" })),
    ).rejects.toThrow("Failed to delete category");

    expect(consoleErrorSpy).toHaveBeenCalled();
  });
});
