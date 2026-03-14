import { useState, useEffect } from "react";
import { supabase } from "../supabase";
import { useNavigate } from "react-router-dom";

export default function ResetPassword() {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isValidSession, setIsValidSession] = useState<boolean | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    let isMounted = true;

    const handleRecovery = async () => {
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const queryParams = new URLSearchParams(window.location.search.substring(1));
      const accessToken = hashParams.get("access_token") || queryParams.get("access_token");
      const refreshToken = hashParams.get("refresh_token") || queryParams.get("refresh_token");
      const type = hashParams.get("type") || queryParams.get("type");

      // Check for error parameters first (e.g., expired or invalid links)
      const errorCode = hashParams.get("error_code") || queryParams.get("error_code");
      const errorParam = hashParams.get("error") || queryParams.get("error");

      if (errorCode || errorParam) {
        // Link has error (expired, invalid, etc.) - show invalid/expired message immediately
        if (isMounted) {
          setIsValidSession(false);
        }
        return;
      }

      try {
        // If we have recovery parameters, set session explicitly
        if (type === "recovery" && accessToken && refreshToken) {
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (error) {
            if (isMounted) {
              setIsValidSession(false);
            }
            return;
          }

          const { data: { session } } = await supabase.auth.getSession();

          if (isMounted) {
            setIsValidSession(!!session);
          }
          return;
        }

        // No hash/query parameters - check if there's an existing session
        const { data: { session } } = await supabase.auth.getSession();
        if (isMounted) {
          setIsValidSession(!!session);
        }
      } catch (recoveryError) {
        console.error("Error handling password recovery:", recoveryError);
        if (isMounted) {
          setIsValidSession(false);
        }
      }
    };

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (!isMounted) return;
      
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") {
        setIsValidSession(true);
      } else if (event === "SIGNED_OUT") {
        setIsValidSession(false);
      }
    });

    handleRecovery();

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.updateUser({ password: newPassword });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      setSuccess(true);
      setLoading(false);
      // Redirect to home after a short delay
      setTimeout(() => {
        navigate("/");
      }, 3000);
    }
  };

  // Loading state while checking session
  if (isValidSession === null) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center pt-24 pb-12 px-4 sm:px-6 lg:px-8" style={{ background: 'var(--background)' }}>
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--primary)]"></div>
      </div>
    );
  }

  // Invalid or expired session
  if (!isValidSession) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center pt-24 pb-12 px-4 sm:px-6 lg:px-8" style={{ background: 'var(--background)' }}>
        <div className="max-w-md w-full bg-[var(--card-bg)] shadow-xl rounded-2xl border border-[var(--border)] p-8">
          <h1 className="text-3xl font-bold text-[var(--text-primary)] mb-4 text-center">
            Invalid or Expired Link
          </h1>
          <p className="text-[var(--text-secondary)] text-center mb-6">
            This password reset link is invalid or has expired. Please request a new one.
          </p>
          <button
            onClick={() => navigate("/auth")}
            className="w-full bg-[var(--primary)] hover:bg-[var(--primary-light)] text-white font-bold py-3 px-6 rounded-lg transition-all"
          >
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center pt-24 pb-12 px-4 sm:px-6 lg:px-8" style={{ background: 'var(--background)' }}>
      <div className="max-w-md w-full bg-[var(--card-bg)] shadow-xl rounded-2xl border border-[var(--border)] p-8">
        <h1 className="text-3xl font-bold text-[var(--text-primary)] mb-2 text-center">
          Set New Password
        </h1>
        <p className="text-[var(--text-secondary)] text-center mb-8">
          Enter your new password below
        </p>

        {success ? (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <div>
                <p className="text-green-700 font-medium">Password updated successfully!</p>
                <p className="text-green-600 text-sm mt-1">
                  Redirecting you to the homepage...
                </p>
              </div>
            </div>
          </div>
        ) : (
          <form onSubmit={handleResetPassword} className="space-y-6">
            <div>
              <label
                className="block text-sm font-semibold text-[var(--text-primary)] mb-2"
                htmlFor="newPassword"
              >
                New Password
              </label>
              <input
                className="shadow-sm border border-[var(--border)] rounded-lg w-full py-2.5 px-4 bg-[var(--background)] text-[var(--text-primary)] leading-tight focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
                id="newPassword"
                type="password"
                placeholder="Min 6 characters"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                minLength={6}
                required
              />
            </div>

            <div>
              <label
                className="block text-sm font-semibold text-[var(--text-primary)] mb-2"
                htmlFor="confirmPassword"
              >
                Confirm New Password
              </label>
              <input
                className="shadow-sm border border-[var(--border)] rounded-lg w-full py-2.5 px-4 bg-[var(--background)] text-[var(--text-primary)] leading-tight focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
                id="confirmPassword"
                type="password"
                placeholder="Confirm your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                minLength={6}
                required
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
              {loading ? "Updating..." : "Update Password"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
