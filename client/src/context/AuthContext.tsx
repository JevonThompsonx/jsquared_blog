

import {
  createContext,
  useState,
  useEffect,
  useContext,
  ReactNode,
} from "react";
import { supabase } from "../supabase";
import { Session, User } from "@supabase/supabase-js";
import { ThemeName } from "../../../shared/src/types";
import {
  getCachedProfile,
  setCachedProfile,
  clearCachedProfile,
} from "../utils/profileCache";

// Extend the User type to include profile data
interface CustomUser extends User {
  role?: string;
  token?: string;
  username?: string | null;
  avatar_url?: string | null;
  theme_preference?: ThemeName;
}

// Define the shape of the context's value
interface AuthContextType {
  session: Session | null;
  user: CustomUser | null;
  logout: () => Promise<void>;
  loading: boolean;
  token: string | null;
  isAdmin: boolean;
  updateProfile: (data: { username?: string; avatar_url?: string; theme_preference?: ThemeName }) => Promise<void>;
  refreshProfile: () => Promise<void>;
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
          // Try to use cached profile for immediate display (no flash!)
          const cachedProfile = getCachedProfile(session.user.id);

          if (cachedProfile) {
            // Use cached data immediately
            setUser({
              ...session.user,
              role: cachedProfile.role,
              username: cachedProfile.username,
              avatar_url: cachedProfile.avatar_url,
              theme_preference: cachedProfile.theme_preference,
              token: session.access_token,
            });
          } else {
            // No cache - set user without profile data initially
            setUser({ ...session.user, token: session.access_token });
          }

          setLoading(false); // Allow app to render while profile loads

          // Fetch fresh profile data
          const { data: profile, error } = await supabase
            .from("profiles")
            .select("role, username, avatar_url, theme_preference")
            .eq("id", session.user.id)
            .single();

          if (error) {
            console.error("Error fetching profile:", error);
          } else if (profile) {
            // Update cache with fresh data
            setCachedProfile({
              userId: session.user.id,
              username: profile.username,
              avatar_url: profile.avatar_url,
              role: profile.role,
              theme_preference: profile.theme_preference,
            });

            // Update user with profile data once fetched
            setUser({
              ...session.user,
              role: profile.role,
              username: profile.username,
              avatar_url: profile.avatar_url,
              theme_preference: profile.theme_preference,
              token: session.access_token,
            });
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
          // Try to use cached profile for immediate display
          const cachedProfile = getCachedProfile(session.user.id);

          if (cachedProfile) {
            setUser({
              ...session.user,
              role: cachedProfile.role,
              username: cachedProfile.username,
              avatar_url: cachedProfile.avatar_url,
              theme_preference: cachedProfile.theme_preference,
              token: session.access_token,
            });
          } else {
            setUser({ ...session.user, token: session.access_token });
          }

          setLoading(false);

          // Then fetch fresh profile data
          const { data: profile, error } = await supabase
            .from("profiles")
            .select("role, username, avatar_url, theme_preference")
            .eq("id", session.user.id)
            .single();

          if (error) {
            console.error("Error fetching profile on auth change:", error);
          } else if (profile) {
            // Update cache
            setCachedProfile({
              userId: session.user.id,
              username: profile.username,
              avatar_url: profile.avatar_url,
              role: profile.role,
              theme_preference: profile.theme_preference,
            });

            setUser({
              ...session.user,
              role: profile.role,
              username: profile.username,
              avatar_url: profile.avatar_url,
              theme_preference: profile.theme_preference,
              token: session.access_token,
            });
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
      // Clear profile cache
      clearCachedProfile();

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

  // Compute isAdmin from user role
  const isAdmin = user?.role === "admin";

  // Update user profile (username, avatar_url, theme_preference)
  const updateProfile = async (data: { username?: string; avatar_url?: string; theme_preference?: ThemeName }) => {
    if (!user) throw new Error("Not authenticated");

    const { error } = await supabase
      .from("profiles")
      .update(data)
      .eq("id", user.id);

    if (error) throw error;

    // Update local user state
    const updatedUser = { ...user, ...data };
    setUser(updatedUser);

    // Update cache
    setCachedProfile({
      userId: user.id,
      username: updatedUser.username ?? null,
      avatar_url: updatedUser.avatar_url ?? null,
      role: updatedUser.role || "viewer",
      theme_preference: updatedUser.theme_preference,
    });
  };

  // Refresh profile data from database
  const refreshProfile = async () => {
    if (!session) return;

    const { data: profile, error } = await supabase
      .from("profiles")
      .select("role, username, avatar_url, theme_preference")
      .eq("id", session.user.id)
      .single();

    if (error) {
      console.error("Error refreshing profile:", error);
      return;
    }

    if (profile) {
      // Update cache
      setCachedProfile({
        userId: session.user.id,
        username: profile.username,
        avatar_url: profile.avatar_url,
        role: profile.role,
        theme_preference: profile.theme_preference,
      });

      setUser({
        ...session.user,
        role: profile.role,
        username: profile.username,
        avatar_url: profile.avatar_url,
        theme_preference: profile.theme_preference,
        token: session.access_token,
      });
    }
  };

  const value = {
    session,
    user,
    logout,
    loading,
    token: session?.access_token || null,
    isAdmin,
    updateProfile,
    refreshProfile,
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
