

import { useState, useEffect, useMemo } from "react";
import { supabase } from "../supabase";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { createLogger } from "../utils/logger";

export default function Auth() {
  const logger = useMemo(() => createLogger("auth-ui"), []);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [isSignupMode, setIsSignupMode] = useState(false);
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

  const handleLogin = async () => {
    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      setError("Please enter both email and password.");
      return;
    }

    setLoading(true);
    setError(null);
    const startTime = performance.now();

    try {
      logger.info("Login started", { hasEmail: Boolean(trimmedEmail) });
      const { data, error } = await runWithTimeout(
        supabase.auth.signInWithPassword({
          email: trimmedEmail,
          password,
        }),
        10000,
        "Login timed out. Please try again.",
      );

      const durationMs = Math.round(performance.now() - startTime);
      if (error) {
        logger.warn("Login failed", { durationMs, error });
        setError(error.message);
        return;
      }

      logger.info("Login completed", {
        durationMs,
        hasSession: Boolean(data?.session),
        hasUser: Boolean(data?.user),
      });

      if (!data?.session) {
        setError("Login succeeded but no session was returned. Please verify your email and try again.");
        return;
      }

      retryAuth();
    } catch (caughtError) {
      const message = caughtError instanceof Error ? caughtError.message : "Login failed.";
      logger.error("Login exception", { message });
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async () => {
    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      setError("Please enter both email and password.");
      return;
    }

    setLoading(true);
    setError(null);
    const startTime = performance.now();

    try {
      logger.info("Signup started", { hasEmail: Boolean(trimmedEmail) });

      const { error: loginError } = await runWithTimeout(
        supabase.auth.signInWithPassword({
          email: trimmedEmail,
          password,
        }),
        10000,
        "Login timed out. Please try again.",
      );

      if (loginError && loginError.message.includes("Invalid login credentials")) {
        const { data: signupData, error: signupError } = await runWithTimeout(
          supabase.auth.signUp({
            email: trimmedEmail,
            password,
          }),
          10000,
          "Signup timed out. Please try again.",
        );

        if (signupError) {
          logger.warn("Signup failed", { error: signupError });
          setError(signupError.message);
          return;
        }

        if (displayName.trim() && signupData.user) {
          const { error: profileError } = await supabase
            .from("profiles")
            .update({ username: displayName.trim() })
            .eq("id", signupData.user.id);
          if (profileError) {
            logger.warn("Signup profile update failed", { error: profileError });
          }
        }

        const durationMs = Math.round(performance.now() - startTime);
        logger.info("Signup completed", {
          durationMs,
          hasSession: Boolean(signupData.session),
        });

        alert("Signup successful! Please check your email to verify your account.");
        return;
      }

      if (loginError) {
        logger.warn("Login failed during signup", { error: loginError });
        setError(loginError.message);
        return;
      }

      const durationMs = Math.round(performance.now() - startTime);
      logger.info("Login succeeded during signup", { durationMs });
      retryAuth();
    } catch (caughtError) {
      const message = caughtError instanceof Error ? caughtError.message : "Signup failed.";
      logger.error("Signup exception", { message });
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center pt-24 pb-12 px-4 sm:px-6 lg:px-8" style={{ background: 'var(--background)' }}>
      <div className="max-w-md w-full bg-[var(--card-bg)] shadow-xl rounded-2xl border border-[var(--border)] p-8">
        <h1 className="text-3xl font-bold text-[var(--text-primary)] mb-2 text-center">
          {isSignupMode ? "Create Account" : "Welcome Back"}
        </h1>
        <p className="text-[var(--text-secondary)] text-center mb-8">
          {isSignupMode ? "Sign up to get started" : "Login to your account"}
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

        <form
          className="space-y-6"
          onSubmit={(event) => {
            event.preventDefault();
            if (loading) return;
            if (isSignupMode) {
              void handleSignup();
            } else {
              void handleLogin();
            }
          }}
        >
          <div>
            <label
              className="block text-sm font-semibold text-[var(--text-primary)] mb-2"
              htmlFor="email"
            >
              Email
            </label>
            <input
              className="shadow-sm border border-[var(--border)] rounded-lg w-full py-2.5 px-4 bg-[var(--background)] text-[var(--text-primary)] leading-tight focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
              id="email"
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          {/* Display Name - only shown in signup mode */}
          {isSignupMode && (
            <div>
              <label
                className="block text-sm font-semibold text-[var(--text-primary)] mb-2"
                htmlFor="displayName"
              >
                Display Name <span className="text-[var(--text-secondary)] font-normal">(optional)</span>
              </label>
              <input
                className="shadow-sm border border-[var(--border)] rounded-lg w-full py-2.5 px-4 bg-[var(--background)] text-[var(--text-primary)] leading-tight focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
                id="displayName"
                type="text"
                placeholder="How should we call you?"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                maxLength={50}
              />
            </div>
          )}

          <div>
            <label
              className="block text-sm font-semibold text-[var(--text-primary)] mb-2"
              htmlFor="password"
            >
              Password
            </label>
            <input
              className="shadow-sm border border-[var(--border)] rounded-lg w-full py-2.5 px-4 bg-[var(--background)] text-[var(--text-primary)] leading-tight focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
              id="password"
              type="password"
              placeholder="******************"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          <button
            className="w-full bg-[var(--primary)] hover:bg-[var(--primary-light)] text-white font-bold py-3 px-6 rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--primary)] transition-all disabled:opacity-50"
            type="submit"
            disabled={loading}
          >
            {loading
              ? isSignupMode
                ? "Creating account..."
                : "Logging in..."
              : isSignupMode
              ? "Create Account"
              : "Log In"}
          </button>
        </form>

        {/* Toggle between login and signup */}
        <div className="mt-6 text-center">
          <p className="text-[var(--text-secondary)] text-sm">
            {isSignupMode ? "Already have an account?" : "Don't have an account?"}
            <button
              type="button"
              onClick={() => {
                setIsSignupMode(!isSignupMode);
                setError(null);
              }}
              className="ml-2 text-[var(--primary)] hover:text-[var(--primary-light)] font-semibold transition-colors"
            >
              {isSignupMode ? "Log In" : "Sign Up"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
