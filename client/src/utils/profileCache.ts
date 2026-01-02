import { ThemeName } from "../../../shared/src/types";

interface CachedProfile {
  userId: string;
  username: string | null;
  avatar_url: string | null;
  role: string;
  theme_preference?: ThemeName;
  timestamp: number;
}

const CACHE_KEY = "j2adventures_profile_cache";
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

export function getCachedProfile(userId: string): CachedProfile | null {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return null;

    const profile: CachedProfile = JSON.parse(cached);

    // Check if cache is for current user and not expired
    if (profile.userId !== userId) return null;
    if (Date.now() - profile.timestamp > CACHE_TTL) {
      localStorage.removeItem(CACHE_KEY);
      return null;
    }

    return profile;
  } catch {
    return null;
  }
}

export function setCachedProfile(
  profile: Omit<CachedProfile, "timestamp">
): void {
  try {
    localStorage.setItem(
      CACHE_KEY,
      JSON.stringify({ ...profile, timestamp: Date.now() })
    );
  } catch (error) {
    console.warn("Failed to cache profile:", error);
  }
}

export function clearCachedProfile(): void {
  try {
    localStorage.removeItem(CACHE_KEY);
  } catch {
    // Ignore errors
  }
}
