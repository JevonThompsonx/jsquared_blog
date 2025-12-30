

import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useState, useEffect, type Dispatch, type SetStateAction, type FC } from "react";

import { ThemeName } from "../../../shared/src/types";


interface NavbarProps {
  currentTheme: string;
  setCurrentTheme: Dispatch<SetStateAction<ThemeName>>;
  searchTerm: string;
  setSearchTerm: Dispatch<SetStateAction<string>>;
  searchInputRef: React.RefObject<HTMLInputElement | null>;
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

export default function Navbar({
  currentTheme,
  setCurrentTheme,
  searchTerm,
  setSearchTerm,
  searchInputRef,
}: NavbarProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.key === 'k') {
        event.preventDefault();
        searchInputRef.current?.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [searchInputRef]);


  const toggleTheme = () => {
    const newTheme = currentTheme.startsWith("day")
      ? "midnightGarden"
      : "daylightGarden";
    setCurrentTheme(newTheme);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    navigate('/');
    window.scrollTo({
      top: window.innerHeight,
      behavior: "smooth",
    });
  };

  return (
    <header className="navbar-landing">
      <div className="container mx-auto flex justify-between items-center p-4 max-w-full">
        <Link to="/" className="text-xl sm:text-2xl font-bold text-[var(--text-primary)]">
          J²Adventures
        </Link>
        <div className="hidden md:flex items-center space-x-4">
          <div className="relative">
            <input
              type="text"
              placeholder="Search... (Ctrl+K)"
              value={searchTerm}
              onChange={handleSearchChange}
              ref={searchInputRef}
              className="pl-8 pr-2 py-1.5 rounded-md border border-[var(--border)] bg-[var(--card-bg)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)] w-40 lg:w-64 transition-all duration-300"
            />
            <div className="absolute left-2 top-1/2 -translate-y-1/2">
              <SearchIcon />
            </div>
          </div>

          <button
            onClick={toggleTheme}
            className="relative inline-flex items-center h-8 w-16 rounded-full bg-[var(--border)] hover:bg-[var(--text-secondary)] transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:ring-offset-2"
            title={currentTheme.startsWith("day") ? "Switch to Dark Mode" : "Switch to Light Mode"}
          >
            <span
              className={`absolute inline-flex items-center justify-center h-6 w-6 rounded-full bg-[var(--primary)] shadow-lg transform transition-all duration-300 ${
                currentTheme.startsWith("day") ? "translate-x-1" : "translate-x-9"
              }`}
            >
              {currentTheme.startsWith("day") ? (
                <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              ) : (
                <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              )}
            </span>
          </button>

          {user ? (
            <>
              {user.role === 'admin' && (
                <Link
                  to="/admin"
                  className="text-[var(--text-primary)]"
                >
                  Admin
                </Link>
              )}
              <span className="text-sm text-[var(--text-secondary)] hidden sm:inline">
                {user.email}
              </span>
              <button
                onClick={logout}
                className="bg-[var(--text-secondary)] hover:bg-gray-700 text-white font-bold py-2 px-4 rounded"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link
                to="/auth"
                className="text-[var(--text-primary)]"
              >
                Login
              </Link>
              <Link
                to="/auth"
                className="bg-[var(--primary)] hover:bg-[var(--primary-light)] text-white font-bold py-2 px-4 rounded"
              >
                Sign Up
              </Link>
            </>
          )}
        </div>
        <div className="md:hidden flex items-center">
          <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="text-[var(--text-primary)]">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={isMenuOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16m-7 6h7"} />
            </svg>
          </button>
        </div>
      </div>
      {isMenuOpen && (
        <div className="md:hidden mobile-menu w-full max-w-full overflow-x-hidden">
          <div className="px-4 pt-2 pb-3 space-y-2">
            <div className="relative">
              <input
                type="text"
                placeholder="Search... (Ctrl+K)"
                value={searchTerm}
                onChange={handleSearchChange}
                ref={searchInputRef}
                className="w-full pl-8 pr-2 py-1.5 rounded-md border border-[var(--border)] bg-[var(--card-bg)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
              />
              <div className="absolute left-2 top-1/2 -translate-y-1/2">
                <SearchIcon />
              </div>
            </div>
            <button
              onClick={() => {
                toggleTheme();
                setIsMenuOpen(false);
              }}
              className="w-full flex items-center justify-between text-[var(--text-primary)] focus:outline-none p-2 text-sm hover:bg-[var(--border)] rounded transition-colors"
            >
              <span className="flex items-center gap-2">
                {currentTheme.startsWith("day") ? (
                  <>
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                    </svg>
                    Switch to Dark Mode
                  </>
                ) : (
                  <>
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                    Switch to Light Mode
                  </>
                )}
              </span>
              <svg className="h-4 w-4 text-[var(--text-secondary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
            {user ? (
              <>
                {user.role === 'admin' && (
                  <Link
                    to="/admin"
                    onClick={() => setIsMenuOpen(false)}
                    className="block text-[var(--text-primary)] p-2 text-sm"
                  >
                    Admin
                  </Link>
                )}
                <span className="block text-xs text-[var(--text-secondary)] p-2 truncate">
                  {user.email}
                </span>
                <button
                  onClick={logout}
                  className="w-full text-left bg-[var(--text-secondary)] hover:bg-gray-700 text-white font-semibold py-2 px-3 rounded text-sm"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/auth"
                  onClick={() => setIsMenuOpen(false)}
                  className="block text-[var(--text-primary)] p-2 text-sm"
                >
                  Login
                </Link>
                <Link
                  to="/auth"
                  onClick={() => setIsMenuOpen(false)}
                  className="block bg-[var(--primary)] hover:bg-[var(--primary-light)] text-white font-semibold py-2 px-3 rounded text-center text-sm"
                >
                  Sign Up
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
