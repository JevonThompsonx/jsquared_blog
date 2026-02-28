import {
  createContext,
  useState,
  useEffect,
  useContext,
  ReactNode,
  useRef,
  useCallback,
  useMemo,
} from "react";
import { supabase, supabaseUrl, supabaseAnonKey } from "../supabase";
import { Session, User } from "@supabase/supabase-js";
import { ThemeName, DateFormatPreference } from "../../../shared/src/types";
import {
  getCachedProfile,
  setCachedProfile,
  clearCachedProfile,
} from "../utils/profileCache";
import { createLogger } from "../utils/logger";

// Extend the User type to include profile data
interface CustomUser extends User {
  role?: string;
  token?: string;
  username?: string | null;
  avatar_url?: string | null;
  theme_preference?: ThemeName;
  date_format_preference?: DateFormatPreference;
}

// Define the shape of the context's value
interface AuthContextType {
  session: Session | null;
  user: CustomUser | null;
  logout: () => Promise<void>;
  loading: boolean;
  token: string | null;
  isAdmin: boolean;
  authStatus: "loading" | "ready" | "timedOut";
  profileStatus: "idle" | "loading" | "ready" | "error" | "timedOut";
  retryAuth: () => void;
  updateProfile: (data: { username?: string; avatar_url?: string; theme_preference?: ThemeName; date_format_preference?: DateFormatPreference }) => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const logger = useMemo(() => createLogger("auth"), []);
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<CustomUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [authStatus, setAuthStatus] = useState<"loading" | "ready" | "timedOut">("loading");
  const [profileStatus, setProfileStatus] = useState<"idle" | "loading" | "ready" | "error" | "timedOut">("idle");
  const [initialCheckCompleted, setInitialCheckCompleted] = useState(false);
  const initRequestIdRef = useRef(0);

  const getProjectRef = useCallback(() => {
    try {
      const url = new URL(supabaseUrl);
      return url.hostname.split(".")[0] ?? null;
    } catch {
      return null;
    }
  }, []);

  const getAuthStorageSnapshot = useCallback(
    (context: string) => {
      const projectRef = getProjectRef();
      if (!projectRef) {
        logger.warn("Auth storage snapshot skipped (invalid Supabase URL)", { context });
        return null;
      }

      if (typeof window === "undefined" || !window.localStorage) {
        logger.warn("Auth storage snapshot skipped (no localStorage)", { context });
        return null;
      }

      const key = `sb-${projectRef}-auth-token`;
      const raw = window.localStorage.getItem(key);
      if (!raw) {
        logger.debug("Auth storage snapshot", { context, key, exists: false });
        return { key, exists: false };
      }

      try {
        const parsed = JSON.parse(raw) as Record<string, unknown>;
        const accessToken = typeof parsed.access_token === "string" ? parsed.access_token : null;
        const refreshToken = typeof parsed.refresh_token === "string" ? parsed.refresh_token : null;
        const expiresAt = typeof parsed.expires_at === "number" ? parsed.expires_at : null;

        logger.debug("Auth storage snapshot", {
          context,
          key,
          exists: true,
          hasAccessToken: Boolean(accessToken),
          hasRefreshToken: Boolean(refreshToken),
          expiresAt,
        });

        return {
          key,
          exists: true,
          accessToken,
          refreshToken,
          expiresAt,
        };
      } catch (error) {
        logger.warn("Auth storage snapshot parse failed", { context, key, error });
        return { key, exists: true, parseError: true };
      }
    },
    [getProjectRef, logger],
  );

  const checkSupabaseHealth = useCallback(
    async (context: string) => {
      try {
        const controller = new AbortController();
        const timeoutId = window.setTimeout(() => controller.abort(), 4000);
        const response = await fetch(`${supabaseUrl}/auth/v1/health`, {
          method: "GET",
          signal: controller.signal,
          headers: {
            apikey: supabaseAnonKey,
          },
        });
        clearTimeout(timeoutId);
        logger.info("Supabase auth health check", {
          context,
          status: response.status,
          ok: response.ok,
        });
      } catch (error) {
        logger.warn("Supabase auth health check failed", { context, error });
      }
    },
    [logger],
  );

  const applySession = useCallback(
    async (nextSession: Session, context: string) => {
      setSession(nextSession);
      logger.info("Applying session", {
        context,
        userId: nextSession.user?.id,
        expiresAt: nextSession.expires_at,
      });

      const cachedProfile = getCachedProfile(nextSession.user.id);
      if (cachedProfile) {
        logger.debug("Using cached profile", { userId: nextSession.user.id, context });
        setProfileStatus("ready");
        setUser({
          ...nextSession.user,
          role: cachedProfile.role,
          username: cachedProfile.username,
          avatar_url: cachedProfile.avatar_url,
          theme_preference: cachedProfile.theme_preference,
          date_format_preference: cachedProfile.date_format_preference,
          token: nextSession.access_token,
        });
      } else {
        setProfileStatus("loading");
        setUser({ ...nextSession.user, token: nextSession.access_token });
      }

      setLoading(false);
      setAuthStatus("ready");

      logger.info("Fetching profile", { userId: nextSession.user.id, context });

      try {
        const profilePromise = supabase
          .from("profiles")
          .select("role, username, avatar_url, theme_preference, date_format_preference")
          .eq("id", nextSession.user.id)
          .single();

        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("Profile fetch timed out")), 8000),
        );

        const { data: profile, error } = await Promise.race([
          profilePromise,
          timeoutPromise,
        ]) as { data: { role: string; username: string | null; avatar_url: string | null; theme_preference?: ThemeName; date_format_preference?: DateFormatPreference } | null; error: { message?: string } | null };

        if (error) {
          logger.warn("Profile fetch failed", { userId: nextSession.user.id, context, error });
          setProfileStatus("error");
          return;
        }

        if (profile) {
          logger.info("Profile fetch succeeded", { userId: nextSession.user.id, role: profile.role, context });
          setCachedProfile({
            userId: nextSession.user.id,
            username: profile.username,
            avatar_url: profile.avatar_url,
            role: profile.role,
            theme_preference: profile.theme_preference,
            date_format_preference: profile.date_format_preference,
          });

          setUser({
            ...nextSession.user,
            role: profile.role,
            username: profile.username,
            avatar_url: profile.avatar_url,
            theme_preference: profile.theme_preference,
            date_format_preference: profile.date_format_preference,
            token: nextSession.access_token,
          });
          setProfileStatus("ready");
        }
      } catch (error) {
        logger.warn("Profile fetch failed", { userId: nextSession.user.id, context, error });
        setProfileStatus(error instanceof Error && error.message.includes("timed out") ? "timedOut" : "error");
      }
    },
    [logger],
  );

  const attemptSessionRehydrate = useCallback(
    async (context: string): Promise<Session | null> => {
      const snapshot = getAuthStorageSnapshot(context);
      if (!snapshot || !snapshot.exists || !snapshot.accessToken || !snapshot.refreshToken) {
        logger.info("Session rehydrate skipped", { context, reason: "no_tokens" });
        return null;
      }

      logger.info("Attempting session rehydrate", {
        context,
        expiresAt: snapshot.expiresAt,
      });

      try {
        const { data, error } = await supabase.auth.setSession({
          access_token: snapshot.accessToken,
          refresh_token: snapshot.refreshToken,
        });

        if (error) {
          logger.warn("Session rehydrate failed", { context, error });
          return null;
        }

        if (data.session) {
          logger.info("Session rehydrate succeeded", {
            context,
            userId: data.session.user?.id,
          });
          return data.session;
        }

        logger.warn("Session rehydrate returned no session", { context });
        return null;
      } catch (error) {
        logger.error("Session rehydrate threw", { context, error });
        return null;
      }
    },
    [getAuthStorageSnapshot, logger],
  );

  useEffect(() => {
    const requestId = ++initRequestIdRef.current;
    let isActive = true;


    const fetchUserAndProfile = async () => {
      const startTime = performance.now();
      setLoading(true);
      setAuthStatus("loading");
      let timedOut = false;
      getAuthStorageSnapshot("init-before");
      void checkSupabaseHealth("init");
      const timeoutId = setTimeout(() => {
        timedOut = true;
        if (!isActive || requestId !== initRequestIdRef.current) return;
        logger.warn("Auth session check timed out", {
          timeoutMs: 7000,
          online: navigator.onLine,
        });
        setInitialCheckCompleted(true);
        setLoading(false);
        setAuthStatus("timedOut");
        void attemptSessionRehydrate("timeout").then((rehydrated) => {
          if (!rehydrated || !isActive || requestId !== initRequestIdRef.current) return;
          void applySession(rehydrated, "rehydrate-timeout");
        });
      }, 7000);

      try {
        logger.info("Auth session check started", {
          online: navigator.onLine,
          requestId,
        });
        const { data: { session }, error } = await supabase.auth.getSession();
        const durationMs = Math.round(performance.now() - startTime);
        if (error) {
          logger.warn("Auth session check returned error", { durationMs, error });
        } else {
          logger.info("Auth session check completed", {
            durationMs,
            hasSession: Boolean(session),
            requestId,
          });
        }
        clearTimeout(timeoutId);
        if (!isActive || requestId !== initRequestIdRef.current) return;
        setInitialCheckCompleted(true);
        if (session) {
          setInitialCheckCompleted(true);
          await applySession(session, "getSession");
        } else {
          logger.info("No active session", { online: navigator.onLine });
          setInitialCheckCompleted(true);
          setUser(null);
          setLoading(false);
          setAuthStatus("ready");
          setProfileStatus("idle");
          void attemptSessionRehydrate("no-session").then((rehydrated) => {
            if (!rehydrated || !isActive || requestId !== initRequestIdRef.current) return;
            void applySession(rehydrated, "rehydrate-no-session");
          });
        }
      } catch (error) {
        clearTimeout(timeoutId);
        if (!isActive || requestId !== initRequestIdRef.current) return;
        logger.error("Auth initialization failed", { error });
        setInitialCheckCompleted(true);
        setSession(null);
        setUser(null);
        setLoading(false);
        setAuthStatus(timedOut ? "timedOut" : "ready");
        setProfileStatus("idle");
        void attemptSessionRehydrate("error").then((rehydrated) => {
          if (!rehydrated || !isActive || requestId !== initRequestIdRef.current) return;
          void applySession(rehydrated, "rehydrate-error");
        });
      }
    };

    fetchUserAndProfile();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        logger.info("Auth state change", {
          event,
          hasSession: Boolean(session),
          userId: session?.user?.id,
        });
        if (session) {
          await applySession(session, `auth-change-${event}`);
        } else {
          logger.info("No session on auth change", { event });
          setSession(null);
          setUser(null);
          setLoading(false);
          setAuthStatus("ready");
          setProfileStatus("idle");
        }
      },
    );

    return () => {
      isActive = false;
      authListener.subscription.unsubscribe();
    };
  }, [applySession, attemptSessionRehydrate, checkSupabaseHealth, getAuthStorageSnapshot, logger]);

  useEffect(() => {
    if (!initialCheckCompleted) return;

    const timeoutId = setTimeout(() => {
      const timeoutHit = authStatus === "timedOut";
      logger.info("Auth state snapshot", {
        status: authStatus,
        hasSession: Boolean(session),
        hasUser: Boolean(user),
        online: navigator.onLine,
        timedOut: timeoutHit,
        profileStatus,
      });
    }, 0);

    return () => clearTimeout(timeoutId);
  }, [authStatus, session, user, initialCheckCompleted, logger, profileStatus]);

  const logout = useCallback(async () => {
    try {
      // Clear profile cache
      clearCachedProfile();

      // Clear state first for immediate UI feedback
      setSession(null);
      setUser(null);
      setProfileStatus("idle");

      logger.info("Logout started");

      // Then sign out from Supabase
      const { error } = await supabase.auth.signOut();
      if (error) {
        logger.warn("Logout error", { error });
      }

      // Force reload to clear any cached data and ensure clean state
      window.location.href = "/";
    } catch (error) {
      logger.error("Logout failed", { error });
      // Force reload even on error
      window.location.href = "/";
    }
  }, [logger]);

  // Compute isAdmin from user role
  const isAdmin = user?.role === "admin";

  const retryAuth = useCallback(() => {
    let timedOut = false;
    const startTime = performance.now();

    setLoading(true);
    setAuthStatus("loading");
    setProfileStatus("idle");

    getAuthStorageSnapshot("retry-before");
    void checkSupabaseHealth("retry");

    const timeoutId = setTimeout(() => {
      timedOut = true;
      logger.warn("Auth retry timed out", {
        timeoutMs: 7000,
        online: navigator.onLine,
      });
      setLoading(false);
      setAuthStatus("timedOut");
      void attemptSessionRehydrate("retry-timeout").then((rehydrated) => {
        if (!rehydrated) return;
        void applySession(rehydrated, "rehydrate-retry-timeout");
      });
    }, 7000);

    logger.info("Auth retry started", { online: navigator.onLine });
    supabase.auth
      .getSession()
      .then(({ data: { session } }) => {
        if (timedOut) return;
        const durationMs = Math.round(performance.now() - startTime);
        clearTimeout(timeoutId);
        if (session) {
          logger.info("Auth retry completed", { durationMs, hasSession: true });
          void applySession(session, "retry-getSession");
        } else {
          logger.info("Auth retry completed", { durationMs, hasSession: false });
          setUser(null);
          setSession(null);
          setProfileStatus("idle");
          setLoading(false);
          setAuthStatus("ready");
        }
      })
      .catch((error) => {
        clearTimeout(timeoutId);
        logger.error("Auth retry failed", { error });
        setSession(null);
        setUser(null);
        setLoading(false);
        setAuthStatus(timedOut ? "timedOut" : "ready");
        setProfileStatus("idle");
        void attemptSessionRehydrate("retry-error").then((rehydrated) => {
          if (!rehydrated) return;
          void applySession(rehydrated, "rehydrate-retry-error");
        });
      });
  }, [applySession, attemptSessionRehydrate, checkSupabaseHealth, getAuthStorageSnapshot, logger]);

  // Update user profile (username, avatar_url, theme_preference, date_format_preference)
  const updateProfile = useCallback(async (data: { username?: string; avatar_url?: string; theme_preference?: ThemeName; date_format_preference?: DateFormatPreference }) => {
    if (!user) throw new Error("Not authenticated");

    logger.info("Profile update started", { fields: Object.keys(data) });

    // Convert empty strings to null for database
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- cleanData is a dynamic object built from known profile fields
    const cleanData: any = {};
    if (data.username !== undefined) {
      cleanData.username = data.username || null;
    }
    if (data.avatar_url !== undefined) {
      cleanData.avatar_url = data.avatar_url || null;
    }
    if (data.theme_preference !== undefined) {
      cleanData.theme_preference = data.theme_preference;
    }
    if (data.date_format_preference !== undefined) {
      cleanData.date_format_preference = data.date_format_preference;
    }

    logger.debug("Profile update payload", cleanData);

    // Add timeout to prevent hanging forever
    const updatePromise = supabase
      .from("profiles")
      .update(cleanData)
      .eq("id", user.id)
      .select();

    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Update timed out after 10 seconds. Please check your internet connection and Supabase permissions.")), 10000)
    );

    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Promise.race between Supabase and timeout requires any cast to destructure result
    const { error, data: result } = await Promise.race([updatePromise, timeoutPromise]) as any;

    if (error) {
      logger.warn("Profile update failed", { error });
      throw new Error(`Failed to update profile: ${error.message || "Unknown error"}. This may be a permissions issue.`);
    }

    logger.info("Profile update succeeded", { updated: Boolean(result?.length) });

    // Update local user state
    const updatedUser = { ...user, ...cleanData };
    setUser(updatedUser);

    // Update cache
    setCachedProfile({
      userId: user.id,
      username: updatedUser.username ?? null,
      avatar_url: updatedUser.avatar_url ?? null,
      role: updatedUser.role || "viewer",
      theme_preference: updatedUser.theme_preference,
      date_format_preference: updatedUser.date_format_preference,
    });

    logger.debug("Profile update local state applied");
  }, [logger, user]);

  // Refresh profile data from database
  const refreshProfile = useCallback(async () => {
    if (!session) return;

    setProfileStatus("loading");
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("role, username, avatar_url, theme_preference, date_format_preference")
      .eq("id", session.user.id)
      .single();

    if (error) {
      logger.warn("Profile refresh failed", { error });
      setProfileStatus("error");
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
        date_format_preference: profile.date_format_preference,
      });

      setUser({
        ...session.user,
        role: profile.role,
        username: profile.username,
        avatar_url: profile.avatar_url,
        theme_preference: profile.theme_preference,
        date_format_preference: profile.date_format_preference,
        token: session.access_token,
      });
      setProfileStatus("ready");
    }
  }, [logger, session]);

  const value = {
    session,
    user,
    logout,
    loading,
    token: session?.access_token || null,
    isAdmin,
    authStatus,
    profileStatus,
    retryAuth,
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
