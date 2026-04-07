import { describe, expect, it, vi } from "vitest";

import { findSupabaseAuthUserByEmail } from "@/lib/e2e/public-auth-fixture";

describe("findSupabaseAuthUserByEmail", () => {
  it("keeps scanning auth-user pages until it finds the fixture email", async () => {
    const listUsers = vi.fn()
      .mockResolvedValueOnce({
        data: {
          users: Array.from({ length: 200 }, (_, index) => ({
            id: `user-${index + 1}`,
            email: `reader-${index + 1}@example.com`,
          })),
        },
        error: null,
      })
      .mockResolvedValueOnce({
        data: {
          users: [
            {
              id: "fixture-user",
              email: "e2e-public@jsquaredadventures.test",
            },
          ],
        },
        error: null,
      });

    const user = await findSupabaseAuthUserByEmail(listUsers, "e2e-public@jsquaredadventures.test");

    expect(user).toMatchObject({
      id: "fixture-user",
      email: "e2e-public@jsquaredadventures.test",
    });
    expect(listUsers).toHaveBeenNthCalledWith(1, { page: 1, perPage: 200 });
    expect(listUsers).toHaveBeenNthCalledWith(2, { page: 2, perPage: 200 });
    expect(listUsers).toHaveBeenCalledTimes(2);
  });

  it("returns null after exhausting the available auth-user pages", async () => {
    const listUsers = vi.fn()
      .mockResolvedValueOnce({
        data: {
          users: Array.from({ length: 200 }, (_, index) => ({
            id: `user-${index + 1}`,
            email: `reader-${index + 1}@example.com`,
          })),
        },
        error: null,
      })
      .mockResolvedValueOnce({
        data: {
          users: [],
        },
        error: null,
      });

    await expect(findSupabaseAuthUserByEmail(listUsers, "e2e-public@jsquaredadventures.test")).resolves.toBeNull();
    expect(listUsers).toHaveBeenCalledTimes(2);
  });

  it("throws a safe error when Supabase listing fails on a later page", async () => {
    const listUsers = vi.fn()
      .mockResolvedValueOnce({
        data: {
          users: Array.from({ length: 200 }, (_, index) => ({
            id: `user-${index + 1}`,
            email: `reader-${index + 1}@example.com`,
          })),
        },
        error: null,
      })
      .mockResolvedValueOnce({
        data: { users: [] },
        error: { message: "temporary outage" },
      });

    await expect(findSupabaseAuthUserByEmail(listUsers, "e2e-public@jsquaredadventures.test")).rejects.toThrow(
      "Failed to list Supabase users for E2E fixture setup: temporary outage",
    );
    expect(listUsers).toHaveBeenNthCalledWith(2, { page: 2, perPage: 200 });
  });
});
