// client/src/components/Auth.tsx
import { useState, FC, FormEvent } from "react";

// You will create this file in a later step
// import { supabase } from '../supabase';

export const Auth: FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleAuth = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    // This is where you'll add Supabase logic
    const authMethod = isLogin
      ? // await supabase.auth.signInWithPassword({ email, password })
        console.log("Logging in with", email)
      : // await supabase.auth.signUp({ email, password })
        console.log("Signing up with", email);

    // After connecting Supabase, you will handle response and error here.
    setMessage(
      isLogin
        ? "Login functionality to be added."
        : "Check your email for the confirmation link!",
    );

    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="p-8 bg-white shadow-lg rounded-lg max-w-sm w-full">
        <h2 className="text-2xl font-bold text-center mb-6">
          {isLogin ? "Log In" : "Sign Up"}
        </h2>
        <form onSubmit={handleAuth}>
          <div className="mb-4">
            <label
              className="block text-gray-700 text-sm font-bold mb-2"
              htmlFor="email"
            >
              Email
            </label>
            <input
              id="email"
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              type="email"
              placeholder="Your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="mb-6">
            <label
              className="block text-gray-700 text-sm font-bold mb-2"
              htmlFor="password"
            >
              Password
            </label>
            <input
              id="password"
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 mb-3 leading-tight focus:outline-none focus:shadow-outline"
              type="password"
              placeholder="Your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <div className="flex items-center justify-between">
            <button
              className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
              type="submit"
              disabled={loading}
            >
              {loading ? "Processing..." : isLogin ? "Log In" : "Sign Up"}
            </button>
            <a
              className="inline-block align-baseline font-bold text-sm text-blue-500 hover:text-blue-800"
              href="#"
              onClick={(e) => {
                e.preventDefault();
                setIsLogin(!isLogin);
                setMessage("");
              }}
            >
              {isLogin ? "Create an account" : "Have an account? Log In"}
            </a>
          </div>
          {message && (
            <p className="mt-4 text-center text-sm text-green-500">{message}</p>
          )}
        </form>
      </div>
    </div>
  );
};
