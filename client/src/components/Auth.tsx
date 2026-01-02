

import { useState, useEffect } from "react";
import { supabase } from "../supabase";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Auth() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [isSignupMode, setIsSignupMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { user } = useAuth();

  // Redirect to home if user is already logged in
  useEffect(() => {
    if (user) {
      navigate("/", { replace: true });
    }
  }, [user, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      setError(error.message);
      setLoading(false);
    }
    // Navigation is handled by useEffect when user becomes available
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // First, try to log in the user
    const { error: loginError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (loginError) {
      // If login fails, check if it's because the user doesn't exist
      // Supabase error message for user not found is typically 'Invalid login credentials'
      if (loginError.message.includes("Invalid login credentials")) {
        // User does not exist, proceed with signup
        const { data: signupData, error: signupError } = await supabase.auth.signUp({
          email,
          password,
        });

        if (signupError) {
          setError(signupError.message);
          setLoading(false);
        } else {
          // If display name was provided and we have a user, update the profile
          if (displayName.trim() && signupData.user) {
            await supabase
              .from("profiles")
              .update({ username: displayName.trim() })
              .eq("id", signupData.user.id);
          }

          alert(
            "Signup successful! Please check your email to verify your account.",
          );
          setLoading(false);
          // Navigation will happen via useEffect if auto-login occurs
        }
      } else {
        // Other login errors (e.g., incorrect password for existing user)
        setError(loginError.message);
        setLoading(false);
      }
    }
    // Navigation is handled by useEffect when user becomes available
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

        <form className="space-y-6">
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
            onClick={isSignupMode ? handleSignup : handleLogin}
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
