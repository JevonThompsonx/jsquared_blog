import { afterEach, describe, expect, it, vi } from "vitest";

const notFoundError = new Error("NEXT_NOT_FOUND");

vi.mock("next/navigation", () => ({
  notFound: vi.fn(() => {
    throw notFoundError;
  }),
}));

vi.mock("@/server/dal/profiles", () => ({
  getPublicAuthorProfileById: vi.fn(),
}));

vi.mock("@/server/dal/comments", () => ({
  countCommentsByUserId: vi.fn(),
  listCommentsByUserId: vi.fn(),
}));

import AuthorProfilePage from "@/app/(blog)/author/[id]/page";
import { countCommentsByUserId, listCommentsByUserId } from "@/server/dal/comments";
import { getPublicAuthorProfileById } from "@/server/dal/profiles";
import { notFound } from "next/navigation";

describe("AuthorProfilePage route param validation", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("fails closed on whitespace-only author ids before hitting the DAL", async () => {
    await expect(AuthorProfilePage({ params: Promise.resolve({ id: "   " }) })).rejects.toThrow(notFoundError);

    expect(getPublicAuthorProfileById).not.toHaveBeenCalled();
    expect(listCommentsByUserId).not.toHaveBeenCalled();
    expect(countCommentsByUserId).not.toHaveBeenCalled();
    expect(notFound).toHaveBeenCalled();
  });

  it("trims valid author ids before querying profile and comment data", async () => {
    vi.mocked(getPublicAuthorProfileById).mockResolvedValue(null);
    vi.mocked(listCommentsByUserId).mockResolvedValue([]);
    vi.mocked(countCommentsByUserId).mockResolvedValue(0);

    await expect(AuthorProfilePage({ params: Promise.resolve({ id: "  user-123  " }) })).rejects.toThrow(notFoundError);

    expect(getPublicAuthorProfileById).toHaveBeenCalledWith("user-123");
    expect(listCommentsByUserId).toHaveBeenCalledWith("user-123", 20);
    expect(countCommentsByUserId).toHaveBeenCalledWith("user-123");
  });
});
