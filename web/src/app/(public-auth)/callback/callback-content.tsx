"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";

type CallbackState = "verifying" | "success" | "error";

function safeRedirectPath(raw: string | null): string {
  if (raw && raw.startsWith("/") && !raw.startsWith("//")) {
    return raw;
  }

  return "/";
}

export function CallbackContent() {
  const searchParams = useSearchParams();
  const [state, setState] = useState<CallbackState>("verifying");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const didRun = useRef(false);

  const supabase = useMemo(() => {
    try {
      return getSupabaseBrowserClient();
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    if (didRun.current) {
      return;
    }

    didRun.current = true;

    void (async () => {
      if (!supabase) {
        setState("error");
        setErrorMessage("Auth is not configured.");
        return;
      }

      const code = searchParams.get("code");
      const tokenHash = searchParams.get("token_hash");
      const type = searchParams.get("type") as "signup" | "email" | "recovery" | null;
      const redirectTo = safeRedirectPath(searchParams.get("redirectTo"));

      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          setState("error");
          setErrorMessage(error.message);
          return;
        }
      } else if (tokenHash && type) {
        const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
        if (error) {
          setState("error");
          setErrorMessage(error.message);
          return;
        }
      } else {
        // No token present — check if Supabase already established a session from URL hash
        const { data } = await supabase.auth.getSession();
        if (!data.session) {
          setState("error");
          setErrorMessage("No verification token found. The link may have expired.");
          return;
        }
      }

      setState("success");
      setTimeout(() => {
        window.location.href = redirectTo;
      }, 1200);
    })();
  }, [supabase, searchParams]);

  if (state === "verifying") {
    return (
      <div className="w-full max-w-sm text-center">
        <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-b-2 border-[var(--primary)]" />
        <p className="text-sm text-[var(--text-secondary)]">Verifying your account…</p>
      </div>
    );
  }

  if (state === "success") {
    return (
      <div className="w-full max-w-sm text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--primary)] text-white text-xl">
          ✓
        </div>
        <h1 className="text-xl font-semibold text-[var(--text-primary)]">You&apos;re in</h1>
        <p className="mt-2 text-sm text-[var(--text-secondary)]">Account confirmed. Redirecting you now…</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-sm text-center">
      <div className="rounded-2xl border border-red-200 bg-red-50 px-6 py-8">
        <h1 className="text-xl font-semibold text-red-800">Verification failed</h1>
        <p className="mt-3 text-sm leading-7 text-red-700">{errorMessage ?? "Something went wrong. The link may have expired."}</p>
        <Link
          className="mt-6 inline-block rounded-full bg-[var(--primary)] px-5 py-2.5 text-sm font-semibold text-white"
          href="/login"
        >
          Back to sign in
        </Link>
      </div>
    </div>
  );
}
