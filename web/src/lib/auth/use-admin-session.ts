"use client";

import { useEffect, useState } from "react";
import { z } from "zod";

const adminSessionSchema = z.object({
  session: z
    .object({
      user: z.object({
        id: z.string(),
        role: z.literal("admin"),
        email: z.string().nullable(),
        name: z.string(),
      }),
    })
    .nullable(),
});

export type ClientAdminSession = z.infer<typeof adminSessionSchema>["session"];

export function useAdminSession(): {
  session: ClientAdminSession;
  loading: boolean;
} {
  const [session, setSession] = useState<ClientAdminSession>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const response = await fetch("/api/auth/session", {
          cache: "no-store",
        });
        if (!response.ok) throw new Error("Admin session unavailable");
        const payload = adminSessionSchema.parse(await response.json());
        if (!cancelled) setSession(payload.session);
      } catch {
        if (!cancelled) setSession(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return { session, loading };
}
