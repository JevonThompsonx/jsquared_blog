

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
  role?: string;
  token?: string;
}

// Define the shape of the context's value
interface AuthContextType {
  session: Session | null;
  user: CustomUser | null;
  logout: () => Promise<void>;
  loading: boolean;
  token: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<CustomUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserAndProfile = async () => {
      setLoading(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setSession(session);

        if (session) {
          // Set user immediately with token, then fetch profile
          setUser({ ...session.user, token: session.access_token });
          setLoading(false); // Allow app to render while profile loads

          // Fetch profile asynchronously without blocking
          const { data: profile, error } = await supabase
            .from("profiles")
            .select("role")
            .eq("id", session.user.id)
            .single();

          if (error) {
            console.error("Error fetching profile:", error);
          } else if (profile?.role) {
            // Update user with role once fetched
            setUser({ ...session.user, role: profile.role, token: session.access_token });
          }
        } else {
          setUser(null);
          setLoading(false);
        }
      } catch (error) {
        console.error("Error during auth initialization:", error);
        setLoading(false);
      }
    };

    fetchUserAndProfile();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);
        if (session) {
          // Set user immediately with token for instant UI update
          setUser({ ...session.user, token: session.access_token });
          setLoading(false);

          // Then fetch profile asynchronously and update with role
          const { data: profile, error } = await supabase
            .from("profiles")
            .select("role")
            .eq("id", session.user.id)
            .single();

          if (error) {
            console.error("Error fetching profile on auth change:", error);
          } else if (profile?.role) {
            setUser({ ...session.user, role: profile.role, token: session.access_token });
          }
        } else {
          setUser(null);
          setLoading(false);
        }
      },
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const logout = async () => {
    try {
      // Clear state first for immediate UI feedback
      setSession(null);
      setUser(null);

      // Then sign out from Supabase
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error("Logout error:", error);
      }

      // Force reload to clear any cached data and ensure clean state
      window.location.href = "/";
    } catch (error) {
      console.error("Logout failed:", error);
      // Force reload even on error
      window.location.href = "/";
    }
  };

  const value = {
    session,
    user,
    logout,
    loading,
    token: session?.access_token || null,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
