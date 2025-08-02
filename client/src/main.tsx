import React from "react";
import ReactDOM from "react-dom/client";
import { createBrowserRouter, RouterProvider, Navigate } from "react-router-dom";
import "./index.css";

// Import your page components
import Home from "./components/Home.tsx";
import Auth from "./components/Auth.tsx";
import Admin from "./components/Admin.tsx";
import { AuthProvider, useAuth } from "./context/AuthContext.tsx";

// Define a PrivateRoute component
const PrivateRoute = ({ children }: { children: JSX.Element }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <div>Loading...</div>; // Or a spinner
  }

  if (!user) {
    return <Navigate to="/auth" />;
  }

  // Check for admin role
  if (user.role !== 'admin') {
    return <Navigate to="/" />;
  }

  return children;
};

// Define the application's routes
const router = createBrowserRouter([
  {
    path: "/",
    element: <Home />,
  },
  {
    path: "/auth",
    element: <Auth />,
  },
  {
    path: "/admin",
    element: <PrivateRoute><Admin /></PrivateRoute>,
  },
]);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  </React.StrictMode>,
);
