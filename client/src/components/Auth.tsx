

import { useState, useEffect, useMemo } from "react";
import { supabase } from "../supabase";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { createLogger } from "../utils/logger";

export default function Auth() {
  const logger = useMemo(() => createLogger("auth-ui"), []);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, authStatus, retryAuth } = useAuth();
  const redirectParam = new URLSearchParams(location.search).get("redirect");
  const redirectPath = (location.state as { from?: Location })?.from?.pathname || redirectParam || "/";

  const runWithTimeout = async <T,>(
    promise: Promise<T>,
    timeoutMs: number,
    timeoutMessage: string,
  ): Promise<T> =>
    await Promise.race([
      promise,
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs),
      ),
    ]);

  // Redirect to home if user is already logged in
  useEffect(() => {
    if (user) {
      navigate(redirectPath, { replace: true });
    }
  }, [user, navigate, redirectPath]);

  const handleGithubLogin = async () => {
    setLoading(true);
    setError(null);
    const startTime = performance.now();

    try {
      logger.info("GitHub login started");

      const redirectTo = `${window.location.origin}/auth${redirectPath && redirectPath !== "/" ? `?redirect=${encodeURIComponent(redirectPath)}` : ""}`;

      const { data, error } = await runWithTimeout(
        supabase.auth.signInWithOAuth({
          provider: "github",
          options: {
            redirectTo,
          },
        }),
        10000,
        "GitHub login timed out. Please try again.",
      );

      const durationMs = Math.round(performance.now() - startTime);
      if (error) {
        logger.warn("GitHub login failed", { durationMs, error });
        setError(error.message);
        return;
      }

      logger.info("GitHub login completed", {
        durationMs,
        hasUrl: Boolean(data?.url),
      });
    } catch (caughtError) {
      const message = caughtError instanceof Error ? caughtError.message : "GitHub login failed.";
      logger.error("GitHub login exception", { message });
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center pt-24 pb-12 px-4 sm:px-6 lg:px-8" style={{ background: 'var(--background)' }}>
      <div className="max-w-md w-full bg-[var(--card-bg)] shadow-xl rounded-2xl border border-[var(--border)] p-8">
        <h1 className="text-3xl font-bold text-[var(--text-primary)] mb-2 text-center">
          Welcome Back
        </h1>
        <p className="text-[var(--text-secondary)] text-center mb-8">
          Sign in with GitHub to access the admin dashboard.
        </p>

        {authStatus === "timedOut" && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
            <p className="text-amber-800 text-sm">
              We could not confirm your session. You can still try to log in, or retry the session check.
            </p>
            <button
              type="button"
              onClick={retryAuth}
              className="mt-2 text-[var(--primary)] hover:text-[var(--primary-light)] font-semibold transition-colors"
            >
              Retry session check
            </button>
          </div>
        )}

        <div className="space-y-6">
          <div className="rounded-xl border border-[var(--border)] bg-[var(--background)] p-4 text-sm text-[var(--text-secondary)] leading-7">
            Public readers can browse the site without logging in. Admin access is now limited to GitHub OAuth so only your approved GitHub account can reach the dashboard.
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          <button
            className="w-full bg-[var(--primary)] hover:bg-[var(--primary-light)] text-white font-bold py-3 px-6 rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--primary)] transition-all disabled:opacity-50"
            type="button"
            onClick={() => {
              if (loading) return;
              void handleGithubLogin();
            }}
            disabled={loading}
          >
            {loading ? "Connecting to GitHub..." : "Continue with GitHub"}
          </button>
        </div>
      </div>
    </div>
  );
}
