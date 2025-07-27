// client/src/components/Navbar.tsx
import { FC, useState } from "react";
import { Link } from "react-router-dom"; // Import Link for navigation

// --- TYPE DEFINITIONS ---
type Theme = { [key: string]: string };
type ThemeName =
  | "midnightGarden"
  | "daylightGarden"
  | "enchantedForest"
  | "daylitForest";

// --- THEME CONFIGURATION ---
const themes: Record<ThemeName, Theme> = {
  midnightGarden: {
    "--background": "#2C3E34",
    "--text-primary": "#F1F1EE",
    "--primary": "#94C794",
    "--border": "#4D6A5A",
    "--card-bg": "#3A5045",
  },
  enchantedForest: {
    "--background": "#1B4332",
    "--text-primary": "#ECF9EE",
    "--primary": "#9370DB",
    "--border": "#40916C",
    "--card-bg": "#2D6A4F",
  },
  daylightGarden: {
    "--background": "linear-gradient(to bottom, #E0E7D9, #C8D1C3)",
    "--text-primary": "#222B26",
    "--primary": "#6A8E23",
    "--border": "#d4e6d4",
    "--card-bg": "#ffffff",
  },
  daylitForest: {
    "--background": "linear-gradient(to bottom, #F5F5DC, #C1D5C0)",
    "--text-primary": "#102A1E",
    "--primary": "#52B788",
    "--border": "#B7CEB7",
    "--card-bg": "#ffffff",
  },
};

// --- HELPER COMPONENTS ---
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

// --- NAVBAR COMPONENT ---
interface NavbarProps {
  currentTheme: ThemeName;
  setCurrentTheme: (theme: ThemeName) => void;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
}

export const Navbar: FC<NavbarProps> = ({
  currentTheme,
  setCurrentTheme,
  searchTerm,
  setSearchTerm,
}) => {
  // This will be replaced by a real user session from a context later
  const [user, setUser] = useState(null);

  const handleLogout = () => {
    // In the future, this will call supabase.auth.signOut()
    console.log("Logging out...");
    setUser(null);
  };

  return (
    <header className="container mx-auto p-4 sm:p-6 lg:p-8 flex flex-col sm:flex-row justify-between items-center mb-8 gap-6 sm:gap-4">
      {/* J² Adventures Title - Now links to the homepage */}
      <Link
        to="/"
        className="text-4xl sm:text-5xl font-bold text-[var(--text-primary)] flex items-center"
      >
        J<sup className="text-2xl sm:text-3xl -top-2 sm:-top-3">2</sup>{" "}
        Adventures
      </Link>

      <div className="flex items-center gap-4 flex-wrap justify-center">
        {/* Theme Toggles */}
        <div className="flex items-center gap-2">
          {(Object.keys(themes) as ThemeName[]).map((name) => (
            <button
              key={name}
              onClick={() => setCurrentTheme(name)}
              className={`w-6 h-6 rounded-full capitalize text-xs transition-all ${currentTheme === name ? "ring-2 ring-offset-2 ring-[var(--primary)]" : ""}`}
              style={{
                background: themes[name]["--background"],
                border: `2px solid ${themes[name]["--primary"]}`,
              }}
              title={name.replace(/([A-Z])/g, " $1").trim()}
            />
          ))}
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-auto">
          <input
            type="text"
            placeholder="Search articles..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full sm:w-64 pl-10 pr-4 py-2 border border-[var(--border)] rounded-full text-sm bg-[var(--card-bg)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] placeholder:text-[var(--text-secondary)]"
          />
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <SearchIcon />
          </div>
        </div>

        {/* Auth Buttons - Updated with Links */}
        <div className="flex items-center gap-2">
          {user ? (
            <button
              onClick={handleLogout}
              className="px-4 py-2 rounded-full text-sm font-semibold bg-[var(--primary)] text-white"
            >
              Logout
            </button>
          ) : (
            <>
              <Link
                to="/auth"
                className="px-4 py-2 rounded-full text-sm font-semibold text-[var(--text-primary)] hover:bg-[var(--card-bg)]"
              >
                Login
              </Link>
              <Link
                to="/auth"
                className="px-4 py-2 rounded-full text-sm font-semibold bg-[var(--primary)] text-white"
              >
                Sign Up
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
};
