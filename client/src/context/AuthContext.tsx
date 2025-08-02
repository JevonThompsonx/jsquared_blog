// client/src/context/AuthContext.tsx

import {
  createContext,
  useState,
  useEffect,
  useContext,
  ReactNode,
} from "react";
import { supabase } from "../supabase";
import { Session, User } from "@supabase/supabase-js";

// Extend the User type to include a role
interface CustomUser extends User {
  role?: string; // Assuming your 'profiles' table has a 'role' column
}

// Define the shape of the context's value
interface AuthContextType {
  session: Session | null;
  user: CustomUser | null;
  logout: () => Promise<void>;
  loading: boolean; // Add loading state
  token: string | null; // Add token to AuthContextType
}

// Create the context with a default undefined value
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Create the AuthProvider component
export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<CustomUser | null>(null);
  const [loading, setLoading] = useState(true); // Initial loading state

  useEffect(() => {
    const fetchUserAndProfile = async () => {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);

      if (session) {
        // Fetch user profile from the 'profiles' table
        const { data: profile, error } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", session.user.id)
          .single();

        if (error) {
          console.error("Error fetching profile:", error);
          setUser({ ...session.user, token: session.access_token }); // Set user without role if profile fetch fails
        } else {
          setUser({ ...session.user, role: profile?.role, token: session.access_token });
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    };

    fetchUserAndProfile();

    // Listen for changes in authentication state (login, logout, etc.)
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);
        if (session) {
          const { data: profile, error } = await supabase
            .from("profiles")
            .select("role")
            .eq("id", session.user.id)
            .single();

          if (error) {
            console.error("Error fetching profile on auth change:", error);
            setUser({ ...session.user, token: session.access_token });
          } else {
            setUser({ ...session.user, role: profile?.role, token: session.access_token });
          }
        } else {
          setUser(null);
        }
        setLoading(false);
      },
    );

    // Cleanup the listener when the component unmounts
    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  // Logout function
  const logout = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setUser(null); // Clear user on logout
  };

  const value = {
    session,
    user,
    logout,
    loading,
    token: session?.access_token || null, // Provide the token in the context value
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Create a custom hook for easy access to the context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
