// client/src/components/Navbar.tsx

import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import type { Dispatch, SetStateAction, FC } from "react";

import { ThemeName } from "../../../shared/src/types";

// Define props for the Navbar, including theme and search functionality
interface NavbarProps {
  currentTheme: string;
  setCurrentTheme: Dispatch<SetStateAction<ThemeName>>;
  searchTerm: string;
  setSearchTerm: Dispatch<SetStateAction<string>>;
}

const SearchIcon: FC = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="h-5 w-5 text-[var(--text-secondary)]"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
    />
  </svg>
);

const SunIcon: FC = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="h-6 w-6"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
    />
  </svg>
);

const MoonIcon: FC = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="h-6 w-6"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
    />
  </svg>
);

export default function Navbar({
  currentTheme,
  setCurrentTheme,
  searchTerm,
  setSearchTerm,
}: NavbarProps) {
  const { user, logout } = useAuth(); // Consume the auth context

  const toggleTheme = () => {
    // Simple toggle logic as an example
    const newTheme = currentTheme.startsWith("day")
      ? "midnightGarden"
      : "daylightGarden";
    setCurrentTheme(newTheme);
  };

  return (
    <header className="sticky top-0 z-50 bg-[var(--background)]/80 backdrop-blur-sm shadow-md transition-colors duration-300">
      <div className="container mx-auto flex justify-between items-center p-4">
        <Link to="/" className="text-2xl font-bold text-[var(--text-primary)]">
          J²Adventures
        </Link>
        <div className="flex items-center space-x-4">
          {/* Search Bar */}
          <div className="relative">
            <input
              type="text"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 pr-2 py-1.5 rounded-md border border-[var(--border)] bg-[var(--card-bg)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
            />
            <div className="absolute left-2 top-1/2 -translate-y-1/2">
              <SearchIcon />
            </div>
          </div>

          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="text-[var(--text-primary)] focus:outline-none"
          >
            {currentTheme.startsWith("day") ? <MoonIcon /> : <SunIcon />}
          </button>

          {/* Auth Buttons */}
          {user ? (
            <>
              {user.role === 'admin' && (
                <Link
                  to="/admin"
                  className="hover:text-gray-300 text-[var(--text-primary)]"
                >
                  Admin
                </Link>
              )}
              <span className="text-sm text-[var(--text-secondary)] hidden sm:inline">
                {user.email}
              </span>
              <button
                onClick={logout}
                className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link
                to="/auth"
                className="hover:text-gray-300 text-[var(--text-primary)]"
              >
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
      </div>
    </header>
  );
}
