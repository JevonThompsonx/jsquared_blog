

import { useState } from "react";
import { supabase } from "../supabase";
import { useNavigate } from "react-router-dom";

export default function Auth() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

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
    } else {
      navigate("/");
    }
    setLoading(false);
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
        const { error: signupError } = await supabase.auth.signUp({
          email,
          password,
        });

        if (signupError) {
          setError(signupError.message);
        } else {
          alert(
            "Signup successful! Please check your email to verify your account.",
          );
          navigate("/");
        }
      } else {
        // Other login errors (e.g., incorrect password for existing user)
        setError(loginError.message);
      }
    } else {
      // Login successful, navigate to home
      navigate("/");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center pt-24 pb-12 px-4 sm:px-6 lg:px-8" style={{ background: 'var(--background)' }}>
      <div className="max-w-md w-full bg-[var(--card-bg)] shadow-xl rounded-2xl border border-[var(--border)] p-8">
        <h1 className="text-3xl font-bold text-[var(--text-primary)] mb-2 text-center">Welcome</h1>
        <p className="text-[var(--text-secondary)] text-center mb-8">Login or create an account</p>

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
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              className="flex-1 bg-[var(--text-secondary)] hover:bg-opacity-80 text-white font-bold py-3 px-6 rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--text-secondary)] transition-all disabled:opacity-50"
              type="submit"
              onClick={handleLogin}
              disabled={loading}
            >
              {loading ? "Logging in..." : "Log In"}
            </button>
            <button
              className="flex-1 bg-[var(--primary)] hover:bg-[var(--primary-light)] text-white font-bold py-3 px-6 rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--primary)] transition-all disabled:opacity-50"
              type="submit"
              onClick={handleSignup}
              disabled={loading}
            >
              {loading ? "Signing up..." : "Sign Up"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
