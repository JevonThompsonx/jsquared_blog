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
  updateTagDescription: vi.fn(),
}));

import { revalidatePath } from "next/cache";
import type { AdminSession } from "@/lib/auth/session";
import { requireAdminSession } from "@/lib/auth/session";
import { updateTagDescriptionAction } from "@/app/admin/tags/actions";
import { updateTagDescription } from "@/server/dal/admin-tags";

const ADMIN_SESSION: AdminSession = {
  user: { id: "admin-1", role: "admin" },
  expires: "2099-01-01T00:00:00.000Z",
};

function makeFormData(values: { tagId?: string; description?: string }): FormData {
  const formData = new FormData();

  if (values.tagId !== undefined) {
    formData.set("tagId", values.tagId);
  }

  if (values.description !== undefined) {
    formData.set("description", values.description);
  }

  return formData;
}

describe("updateTagDescriptionAction", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  it("redirects unauthenticated callers to the admin sign-in gate", async () => {
    vi.mocked(requireAdminSession).mockResolvedValue(null);

    await expect(updateTagDescriptionAction(makeFormData({ tagId: "tag-1", description: "Stories" }))).rejects.toThrow(
      "NEXT_REDIRECT:/admin?error=AccessDenied",
    );

    expect(vi.mocked(updateTagDescription)).not.toHaveBeenCalled();
  });

  it("does not persist invalid payloads", async () => {
    vi.mocked(requireAdminSession).mockResolvedValue(ADMIN_SESSION);

    await updateTagDescriptionAction(makeFormData({ description: "Stories" }));

    expect(vi.mocked(updateTagDescription)).not.toHaveBeenCalled();
    expect(vi.mocked(revalidatePath)).not.toHaveBeenCalled();
  });

  it("rejects whitespace-only tag ids", async () => {
    vi.mocked(requireAdminSession).mockResolvedValue(ADMIN_SESSION);

    await updateTagDescriptionAction(makeFormData({ tagId: "   ", description: "Stories" }));

    expect(vi.mocked(updateTagDescription)).not.toHaveBeenCalled();
    expect(vi.mocked(revalidatePath)).not.toHaveBeenCalled();
  });

  it("normalizes blank descriptions to null before persistence", async () => {
    vi.mocked(requireAdminSession).mockResolvedValue(ADMIN_SESSION);

    await updateTagDescriptionAction(makeFormData({ tagId: "tag-1", description: "   " }));

    expect(vi.mocked(updateTagDescription)).toHaveBeenCalledWith("tag-1", null);
    expect(vi.mocked(revalidatePath)).toHaveBeenCalledWith("/admin/tags");
    expect(vi.mocked(revalidatePath)).toHaveBeenCalledWith("/tag/[slug]", "page");
  });

  it("persists non-empty descriptions unchanged", async () => {
    vi.mocked(requireAdminSession).mockResolvedValue(ADMIN_SESSION);

    await updateTagDescriptionAction(makeFormData({ tagId: "tag-1", description: "Short archive copy" }));

    expect(vi.mocked(updateTagDescription)).toHaveBeenCalledWith("tag-1", "Short archive copy");
  });

  it("does not fail the action when tag revalidation throws after a successful save", async () => {
    vi.mocked(requireAdminSession).mockResolvedValue(ADMIN_SESSION);
    vi.mocked(revalidatePath).mockImplementationOnce(() => {
      throw new Error("revalidation failed");
    });

    await expect(
      updateTagDescriptionAction(makeFormData({ tagId: "tag-1", description: "Short archive copy" })),
    ).resolves.toBeUndefined();

    expect(vi.mocked(updateTagDescription)).toHaveBeenCalledWith("tag-1", "Short archive copy");
    expect(vi.mocked(revalidatePath)).toHaveBeenNthCalledWith(1, "/admin/tags");
    expect(vi.mocked(revalidatePath)).toHaveBeenNthCalledWith(2, "/tag/[slug]", "page");
  });

  it("returns a generic save failure when tag persistence throws after validation", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    vi.mocked(requireAdminSession).mockResolvedValue(ADMIN_SESSION);
    vi.mocked(updateTagDescription).mockRejectedValue(new Error("database unavailable"));

    await expect(
      updateTagDescriptionAction(makeFormData({ tagId: "tag-1", description: "Short archive copy" })),
    ).rejects.toThrow("Failed to save tag description");

    expect(consoleErrorSpy).toHaveBeenCalledOnce();
    expect(vi.mocked(revalidatePath)).not.toHaveBeenCalled();
  });
});
