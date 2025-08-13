import React, { useState, CSSProperties, useRef, useEffect } from "react";
import ReactDOM from "react-dom/client";
import { createBrowserRouter, RouterProvider, Navigate, Outlet } from "react-router-dom";
import "./index.css";


import Home from "./components/Home.tsx";
import Auth from "./components/Auth.tsx";
import Admin from "./components/Admin.tsx";
import PostDetail from "./components/PostDetail.tsx";
import EditPost from "./components/EditPost.tsx";
import Navbar from "./components/Navbar.tsx"; 
import { AuthProvider, useAuth } from "./context/AuthContext.tsx";
import { ThemeName } from "../../shared/src/types"; 


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


const PrivateRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/auth" />;
  }

  
  if (user.role !== 'admin') {
    return <Navigate to="/" />;
  }

  return children;
};


const AppLayout = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [currentTheme, setCurrentTheme] = useState<ThemeName>("daylightGarden");
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      console.log('Keydown event:', event.key, 'ctrl:', event.ctrlKey);
      if (event.ctrlKey && event.key === 'k') {
        console.log('Ctrl+k pressed, focusing search input');
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
      style={themes[currentTheme] as CSSProperties}
      className="min-h-screen transition-colors duration-300"
    >
      <div
        style={{ background: `var(--background)` }}
        className="min-h-screen"
      >
        <Navbar
          currentTheme={currentTheme}
          setCurrentTheme={setCurrentTheme}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          searchInputRef={searchInputRef}
        />
        <Outlet context={{ currentTheme, setCurrentTheme, searchTerm, setSearchTerm }} />
      </div>
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
        path: "posts/:id/edit",
        element: <PrivateRoute><EditPost /></PrivateRoute>,
      },
    ],
  },
]);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  </React.StrictMode>,
);