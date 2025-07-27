// client/src/components/Navbar.tsx

import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext"; // Import the hook

export default function Navbar() {
  const { user, logout } = useAuth(); // Consume the context

  return (
    <header className="bg-gray-800 text-white p-4">
      <nav className="container mx-auto flex justify-between items-center">
        <Link to="/" className="text-2xl font-bold">
          J²Adventures
        </Link>
        <div className="flex items-center space-x-4">
          {user ? (
            // If user is logged in, show their email and a logout button
            <>
              <span>{user.email}</span>
              <button
                onClick={logout}
                className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded"
              >
                Logout
              </button>
            </>
          ) : (
            // If user is not logged in, show login/signup links
            <>
              <Link to="/auth" className="hover:text-gray-300">
                Login
              </Link>
              <Link
                to="/auth"
                className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
              >
                Sign Up
              </Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
