"use client";

import { useState } from "react";

type NewsletterResponseState = {
  status: "success" | "error";
  message: string;
};

type NewsletterApiResponse = {
  status?: "subscribed" | "already-subscribed" | "skipped";
  reason?: "missing-config";
  source?: "created" | "updated";
};

type NewsletterApiResponseLike = Pick<Response, "status" | "ok" | "json">;

export function getNewsletterResponseState(statusCode: number, data: NewsletterApiResponse): NewsletterResponseState {
  if (statusCode === 202 || data.status === "skipped") {
    return {
      status: "error",
      message: "Newsletter signup is not available right now.",
    };
  }

  if (statusCode === 200 && data.status === "already-subscribed") {
    return {
      status: "success",
      message: "You're already on the list!",
    };
  }

  if (statusCode === 201 && data.status === "subscribed") {
    return {
      status: "success",
      message: "You're subscribed!",
    };
  }

  return {
    status: "error",
    message: "Something went wrong. Please try again.",
  };
}

export async function getNewsletterSubmissionState(res: NewsletterApiResponseLike): Promise<NewsletterResponseState> {
  if (res.status === 202) {
    return getNewsletterResponseState(res.status, {});
  }

  if (res.status === 400) {
    return { status: "error", message: "Please enter a valid email address." };
  }

  if (!res.ok) {
    return { status: "error", message: "Something went wrong. Please try again." };
  }

  const data = (await res.json()) as NewsletterApiResponse;
  return getNewsletterResponseState(res.status, data);
}

function SubmitButton({ loading }: { loading: boolean }) {
  return (
    <button
      type="submit"
      disabled={loading}
      className="inline-flex h-10 items-center justify-center rounded-md bg-[var(--btn-bg)] px-4 py-2 text-sm font-medium text-[var(--btn-text)] shadow-sm transition-colors hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {loading ? (
        <>
          <svg className="mr-2 h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Subscribing...
        </>
      ) : (
        "Subscribe"
      )}
    </button>
  );
}

export function NewsletterSignupForm({ source = "footer" }: { source?: string }) {
  const [state, setState] = useState<{
    status: "idle" | "loading" | "success" | "error" | "rate-limited";
    message?: string;
  }>({ status: "idle" });

  async function action(formData: FormData) {
    setState({ status: "loading" });
    const email = formData.get("email");

    try {
      const res = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, source }),
      });

      if (res.status === 429) {
        setState({ status: "rate-limited", message: "Too many attempts, please wait a moment." });
        return;
      }

      setState(await getNewsletterSubmissionState(res));
    } catch {
      setState({ status: "error", message: "Something went wrong. Please try again." });
    }
  }

  if (state.status === "success") {
    return (
      <div className="rounded-[1rem] border border-[var(--color-success-soft-border)] bg-[var(--color-success-soft-bg)] p-4 text-center">
        <p className="text-sm font-medium text-[var(--color-success-text)]">{state.message}</p>
      </div>
    );
  }

  return (
    <form action={action} className="w-full max-w-sm">
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="flex-1">
          <label htmlFor="newsletter-email" className="sr-only">
            Email address
          </label>
          <input
            id="newsletter-email"
            name="email"
            type="email"
            required
            placeholder="Your email address"
            className="w-full h-10 rounded-md border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-2 text-sm text-[var(--input-text)] placeholder:text-[var(--text-secondary)] focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
            disabled={state.status === "loading"}
          />
        </div>
        <SubmitButton loading={state.status === "loading"} />
      </div>
      
      {state.status === "error" && (
        <p className="mt-2 text-sm text-[var(--color-error-text)]" role="alert">
          {state.message}
        </p>
      )}
      
      {state.status === "rate-limited" && (
        <p className="mt-2 text-sm text-[var(--color-warning-text)]" role="alert">
          {state.message}
        </p>
      )}
    </form>
  );
}
