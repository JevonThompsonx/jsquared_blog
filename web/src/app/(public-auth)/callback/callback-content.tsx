"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";

type CallbackState = "verifying" | "success" | "error";
type CallbackType = "signup" | "email" | "recovery";

const GENERIC_CALLBACK_ERROR_MESSAGE = "Something went wrong. The link may have expired.";
const REDIRECT_CONTROL_CHARACTER_PATTERN = /[\u0000-\u001F\u007F\\]/;

function parseCallbackType(value: string | null): CallbackType | null {
  return value === "signup" || value === "email" || value === "recovery" ? value : null;
}

export function safeRedirectPath(raw: string | null): string {
  if (
    raw &&
    raw.startsWith("/") &&
    !raw.startsWith("//") &&
    !REDIRECT_CONTROL_CHARACTER_PATTERN.test(raw)
  ) {
    return raw;
  }

  return "/";
}

function getCallbackErrorMessage(errorMessage: string | null | undefined): string {
  if (!errorMessage) {
    return GENERIC_CALLBACK_ERROR_MESSAGE;
  }

  if (errorMessage === "No verification token found. The link may have expired.") {
    return errorMessage;
  }

  return GENERIC_CALLBACK_ERROR_MESSAGE;
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
        setErrorMessage(GENERIC_CALLBACK_ERROR_MESSAGE);
        return;
      }

      const code = searchParams.get("code");
      const tokenHash = searchParams.get("token_hash");
      const type = parseCallbackType(searchParams.get("type"));
      const redirectTo = safeRedirectPath(searchParams.get("redirectTo"));

      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          setState("error");
          setErrorMessage(getCallbackErrorMessage(error.message));
          return;
        }
      } else if (tokenHash && type) {
        const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
        if (error) {
          setState("error");
          setErrorMessage(getCallbackErrorMessage(error.message));
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
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--primary)] text-[var(--on-primary)] text-xl">
          ✓
        </div>
        <h1 className="text-xl font-semibold text-[var(--text-primary)]">You&apos;re in</h1>
        <p className="mt-2 text-sm text-[var(--text-secondary)]">Account confirmed. Redirecting you now…</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-sm text-center">
      <div className="rounded-2xl border border-[var(--color-error-soft-border)] bg-[var(--color-error-soft-bg)] px-6 py-8">
        <h1 className="text-xl font-semibold text-[var(--color-error-text)]">Verification failed</h1>
        <p className="mt-3 text-sm leading-7 text-[var(--color-error-text)]">{errorMessage ?? GENERIC_CALLBACK_ERROR_MESSAGE}</p>
        <Link
          className="mt-6 inline-block rounded-full bg-[var(--primary)] px-5 py-2.5 text-sm font-semibold text-[var(--on-primary)]"
          href="/login"
        >
          Back to sign in
        </Link>
      </div>
    </div>
  );
}
