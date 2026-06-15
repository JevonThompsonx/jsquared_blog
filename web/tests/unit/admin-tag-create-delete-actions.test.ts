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

vi.mock("@/server/dal/admin-tags", () => ({
  createTag: vi.fn(),
  deleteTag: vi.fn(),
  updateTag: vi.fn(),
  updateTagDescription: vi.fn(),
  TagInUseError: class extends Error {
    constructor(public readonly tagId: string, public readonly postCount: number) {
      super(`Tag ${tagId} still has ${postCount} post(s) attached`);
      this.name = "TagInUseError";
    }
  },
  TagSlugConflictError: class extends Error {
    constructor(public readonly slug: string) {
      super(`A tag with slug ${slug} already exists`);
      this.name = "TagSlugConflictError";
    }
  },
}));

import { revalidatePath } from "next/cache";
import type { AdminSession } from "@/lib/auth/session";
import { requireAdminSession } from "@/lib/auth/session";
import { createTag, deleteTag, TagInUseError, TagSlugConflictError } from "@/server/dal/admin-tags";

import { createTagAction, deleteTagAction } from "@/app/admin/tags/actions";

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

describe("createTagAction", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("redirects unauthenticated callers to the admin sign-in gate", async () => {
    vi.mocked(requireAdminSession).mockResolvedValue(null);

    await expect(
      createTagAction(makeFormData({ name: "Overland" })),
    ).rejects.toThrow("NEXT_REDIRECT:/admin?error=AccessDenied");

    expect(vi.mocked(createTag)).not.toHaveBeenCalled();
  });

  it("redirects non-admin callers to the admin sign-in gate", async () => {
    vi.mocked(requireAdminSession).mockResolvedValue(NON_ADMIN_SESSION);

    await expect(
      createTagAction(makeFormData({ name: "Overland" })),
    ).rejects.toThrow("NEXT_REDIRECT:/admin?error=AccessDenied");

    expect(vi.mocked(createTag)).not.toHaveBeenCalled();
  });

  it("rejects invalid payloads (missing name)", async () => {
    vi.mocked(requireAdminSession).mockResolvedValue(ADMIN_SESSION);

    await expect(createTagAction(makeFormData({}))).rejects.toThrow(
      "NEXT_REDIRECT:/admin/tags?error=InvalidTag",
    );

    expect(vi.mocked(createTag)).not.toHaveBeenCalled();
  });

  it("rejects blank tag names", async () => {
    vi.mocked(requireAdminSession).mockResolvedValue(ADMIN_SESSION);

    await expect(
      createTagAction(makeFormData({ name: "   " })),
    ).rejects.toThrow("NEXT_REDIRECT:/admin/tags?error=InvalidTag");
  });

  it("persists a valid tag and revalidates affected paths", async () => {
    vi.mocked(requireAdminSession).mockResolvedValue(ADMIN_SESSION);
    vi.mocked(createTag).mockResolvedValue({
      id: "tag-overland",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await createTagAction(
      makeFormData({ name: "Overland", slug: "overland", description: "Trail stories" }),
    );

    expect(vi.mocked(createTag)).toHaveBeenCalledWith({
      name: "Overland",
      slug: "overland",
      description: "Trail stories",
    });
    expect(vi.mocked(revalidatePath)).toHaveBeenCalledWith("/admin/tags");
    expect(vi.mocked(revalidatePath)).toHaveBeenCalledWith("/tag/[slug]", "page");
  });

  it("redirects with SlugTaken when the DAL throws TagSlugConflictError", async () => {
    vi.mocked(requireAdminSession).mockResolvedValue(ADMIN_SESSION);
    vi.mocked(createTag).mockRejectedValue(new TagSlugConflictError("overland"));

    await expect(
      createTagAction(makeFormData({ name: "Overland" })),
    ).rejects.toThrow("NEXT_REDIRECT:/admin/tags?error=SlugTaken&slug=overland");

    expect(vi.mocked(revalidatePath)).not.toHaveBeenCalled();
  });

  it("surfaces a generic error when the DAL fails for an unknown reason", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    vi.mocked(requireAdminSession).mockResolvedValue(ADMIN_SESSION);
    vi.mocked(createTag).mockRejectedValue(new Error("database unavailable"));

    await expect(
      createTagAction(makeFormData({ name: "Overland" })),
    ).rejects.toThrow("Failed to save tag");

    expect(consoleErrorSpy).toHaveBeenCalled();
    expect(vi.mocked(revalidatePath)).not.toHaveBeenCalled();
  });
});

describe("deleteTagAction", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("redirects unauthenticated callers to the admin sign-in gate", async () => {
    vi.mocked(requireAdminSession).mockResolvedValue(null);

    await expect(
      deleteTagAction(makeFormData({ id: "tag-1" })),
    ).rejects.toThrow("NEXT_REDIRECT:/admin?error=AccessDenied");

    expect(vi.mocked(deleteTag)).not.toHaveBeenCalled();
  });

  it("rejects payloads missing the id", async () => {
    vi.mocked(requireAdminSession).mockResolvedValue(ADMIN_SESSION);

    await expect(deleteTagAction(makeFormData({}))).rejects.toThrow(
      "NEXT_REDIRECT:/admin/tags?error=InvalidTag",
    );

    expect(vi.mocked(deleteTag)).not.toHaveBeenCalled();
  });

  it("deletes a valid tag and revalidates affected paths", async () => {
    vi.mocked(requireAdminSession).mockResolvedValue(ADMIN_SESSION);
    vi.mocked(deleteTag).mockResolvedValue({ id: "tag-1" });

    await deleteTagAction(makeFormData({ id: "tag-1" }));

    expect(vi.mocked(deleteTag)).toHaveBeenCalledWith("tag-1");
    expect(vi.mocked(revalidatePath)).toHaveBeenCalledWith("/admin/tags");
    expect(vi.mocked(revalidatePath)).toHaveBeenCalledWith("/tag/[slug]", "page");
  });

  it("redirects with TagInUse when posts reference the tag", async () => {
    vi.mocked(requireAdminSession).mockResolvedValue(ADMIN_SESSION);
    vi.mocked(deleteTag).mockRejectedValue(new TagInUseError("tag-1", 2));

    await expect(
      deleteTagAction(makeFormData({ id: "tag-1" })),
    ).rejects.toThrow("NEXT_REDIRECT:/admin/tags?error=TagInUse&posts=2&id=tag-1");
  });

  it("surfaces a generic error when the DAL fails for an unknown reason", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    vi.mocked(requireAdminSession).mockResolvedValue(ADMIN_SESSION);
    vi.mocked(deleteTag).mockRejectedValue(new Error("database unavailable"));

    await expect(
      deleteTagAction(makeFormData({ id: "tag-1" })),
    ).rejects.toThrow("Failed to delete tag");

    expect(consoleErrorSpy).toHaveBeenCalled();
  });
});
