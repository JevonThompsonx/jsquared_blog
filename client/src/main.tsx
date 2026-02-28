import React, { useState, CSSProperties, useRef, useEffect, lazy, Suspense } from "react";
import ReactDOM from "react-dom/client";
import { createBrowserRouter, RouterProvider, Navigate, Outlet, Link, useLocation } from "react-router-dom";
import "./index.css";

// Eager load critical components for initial render (Home is the main route)
import Navbar from "./components/Navbar.tsx";
import Home from "./components/Home.tsx";
import BackToTop from "./components/BackToTop.tsx";
import { AuthProvider, useAuth } from "./context/AuthContext.tsx";
import { ThemeProvider, useTheme } from "./context/ThemeContext.tsx";
import { ThemeName } from "../../shared/src/types";

// Lazy load secondary route components for code splitting
const Auth = lazy(() => import("./components/Auth.tsx"));
const Admin = lazy(() => import("./components/Admin.tsx"));
const PostDetail = lazy(() => import("./components/PostDetail.tsx"));
const EditPost = lazy(() => import("./components/EditPost.tsx"));
const PreviewPost = lazy(() => import("./components/PreviewPost.tsx"));
const Category = lazy(() => import("./components/Category.tsx"));
const Tag = lazy(() => import("./components/Tag.tsx"));
const NotFound = lazy(() => import("./components/NotFound.tsx"));
const AccountSettings = lazy(() => import("./components/AccountSettings.tsx")); 


type Theme = { [key: string]: string };
const themes: Record<ThemeName, Theme> = {
  midnightGarden: {
    "--background": "#2C3E34",
    "--text-primary": "#F1F1EE",
    "--text-secondary": "#B0A99F",
    "--card-bg": "#3A5045",
    "--primary": "#94C794",
    "--primary-light": "#AED8AE",
    "--border": "#4D6A5A",
    "--spinner": "#94C794",
    "--text-shadow": "0 1px 3px rgba(0,0,0,0.3)",
  },
  enchantedForest: {
    "--background": "#1B4332",
    "--text-primary": "#ECF9EE",
    "--text-secondary": "#A9C0A9",
    "--card-bg": "#2D6A4F",
    "--primary": "#9370DB",
    "--primary-light": "#B19CD9",
    "--border": "#40916C",
    "--spinner": "#9370DB",
    "--text-shadow": "0 1px 3px rgba(0,0,0,0.4)",
  },
  daylightGarden: {
    "--background": "linear-gradient(to bottom, #E0E7D9, #C8D1C3)",
    "--text-primary": "#222B26",
    "--text-secondary": "#4A5D54",
    "--text-highlight": "linear-gradient(to right, #4A5D54, #36443C)",
    "--card-bg": "#ffffff",
    "--primary": "#6A8E23",
    "--primary-light": "#94B74B",
    "--border": "#d4e6d4",
    "--spinner": "#6A8E23",
    "--text-shadow": "none",
    "--selection-bg": "#6A8E23",
    "--selection-text": "#ffffff",
  },
  daylitForest: {
    "--background": "linear-gradient(to bottom, #F5F5DC, #C1D5C0)",
    "--text-primary": "#102A1E",
    "--text-secondary": "#2A5240",
    "--text-highlight": "linear-gradient(to right, #2A5240, #1B382B)",
    "--card-bg": "#ffffff",
    "--primary": "#52B788",
    "--primary-light": "#95D5B2",
    "--border": "#B7CEB7",
    "--spinner": "#52B788",
    "--text-shadow": "none",
    "--selection-bg": "#52B788",
    "--selection-text": "#ffffff",
  },
};


// Route that requires admin role
const PrivateRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading, authStatus, profileStatus, retryAuth } = useAuth();
  const location = useLocation();

  if (loading) {
    return <LoadingFallback />;
  }

  if (authStatus === "timedOut") {
    return <AuthTimeoutPanel onRetry={retryAuth} />;
  }

  if (!user) {
    return <Navigate to="/auth" replace state={{ from: location }} />;
  }

  if (profileStatus === "loading") {
    return <LoadingFallback />;
  }

  if (user.role !== 'admin') {
    return <Navigate to="/" replace />;
  }

  return children;
};

// Route that only requires authentication (no admin role needed)
const AuthenticatedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading, authStatus, retryAuth } = useAuth();
  const location = useLocation();

  if (loading) {
    return <LoadingFallback />;
  }

  if (authStatus === "timedOut") {
    return <AuthTimeoutPanel onRetry={retryAuth} />;
  }

  if (!user) {
    return <Navigate to="/auth" replace state={{ from: location }} />;
  }

  return children;
};


// Loading fallback component
const LoadingFallback = () => (
  <div className="flex justify-center items-center h-[50vh]">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--spinner)]"></div>
  </div>
);

const AuthTimeoutPanel = ({ onRetry }: { onRetry: () => void }) => (
  <div className="flex flex-col items-center justify-center text-center min-h-[50vh] px-6">
    <div className="max-w-md w-full bg-[var(--card-bg)] shadow-xl rounded-2xl border border-[var(--border)] p-6">
      <h2 className="text-xl font-bold text-[var(--text-primary)] mb-2">Session check timed out</h2>
      <p className="text-[var(--text-secondary)] mb-6">
        We could not confirm your login status. This is usually a network issue or a blocked request.
      </p>
      <div className="flex flex-col gap-3">
        <button
          type="button"
          onClick={onRetry}
          className="w-full bg-[var(--primary)] hover:bg-[var(--primary-light)] text-white font-bold py-3 px-6 rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--primary)] transition-all"
        >
          Retry session check
        </button>
        <Link
          to="/auth"
          className="w-full text-[var(--primary)] hover:text-[var(--primary-light)] font-semibold transition-colors"
        >
          Go to login
        </Link>
      </div>
    </div>
  </div>
);

const AppLayout = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const { currentTheme } = useTheme();
  const searchInputRef = useRef<HTMLInputElement>(null);

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
  }, []);

  return (
    <div
      style={{
        ...themes[currentTheme] as CSSProperties,
        background: `var(--background)`,
      }}
      className="transition-colors duration-300"
    >
      <Navbar
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        searchInputRef={searchInputRef}
      />
      <Suspense fallback={<LoadingFallback />}>
        <Outlet context={{ searchTerm, setSearchTerm }} />
      </Suspense>
      <BackToTop />
    </div>
  );
};


const router = createBrowserRouter([
  {
    path: "/",
    element: <AppLayout />,
    children: [
      {
        index: true,
        element: <Home />,
      },
      {
        path: "auth",
        element: <Auth />,
      },
      {
        path: "admin",
        element: <PrivateRoute><Admin /></PrivateRoute>,
      },
      {
        path: "posts/:id",
        element: <PostDetail />,
      },
      {
        path: "posts/preview",
        element: <PrivateRoute><PreviewPost /></PrivateRoute>,
      },
      {
        path: "posts/:id/edit",
        element: <PrivateRoute><EditPost /></PrivateRoute>,
      },
      {
        path: "category/:category",
        element: <Category />,
      },
      {
        path: "tag/:slug",
        element: <Tag />,
      },
      {
        path: "settings",
        element: <Navigate to="/profile" replace />,
      },
      {
        path: "profile",
        element: <AuthenticatedRoute><AccountSettings /></AuthenticatedRoute>,
      },
      {
        path: "*",
        element: <NotFound />,
      },
    ],
  },
]);

const container = document.getElementById("root");
if (!container) {
  throw new Error("Root container not found");
}

type RootContainer = typeof container & { __root?: ReactDOM.Root };
const rootContainer = container as RootContainer;
if (!rootContainer.__root) {
  rootContainer.__root = ReactDOM.createRoot(container);
}

rootContainer.__root.render(
  <React.StrictMode>
    <AuthProvider>
      <ThemeProvider>
        <RouterProvider router={router} future={{ v7_startTransition: true }} />
      </ThemeProvider>
    </AuthProvider>
  </React.StrictMode>,
);
