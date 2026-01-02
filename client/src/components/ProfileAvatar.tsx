import { FC, SyntheticEvent, ReactElement } from "react";
import { PresetAvatarId } from "../../../shared/src/types";

interface ProfileAvatarProps {
  avatarUrl?: string | null;
  username?: string | null;
  email?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

// Parse avatar URL to extract type, icon, and color
// Formats: "preset:iconId:colorHex", "letter:colorHex", or image URL
const parseAvatarUrl = (avatarUrl: string | null | undefined) => {
  if (!avatarUrl) return { type: "letter" as const, icon: null, color: null };

  if (avatarUrl.startsWith("http")) {
    return { type: "image" as const, icon: null, color: null };
  }

  if (avatarUrl.startsWith("preset:")) {
    const parts = avatarUrl.replace("preset:", "").split(":");
    const icon = parts[0] as PresetAvatarId;
    const color = parts[1] || null;
    return { type: "preset" as const, icon, color };
  }

  if (avatarUrl.startsWith("letter:")) {
    const color = avatarUrl.replace("letter:", "");
    return { type: "letter" as const, icon: null, color };
  }

  return { type: "letter" as const, icon: null, color: null };
};

// Size mappings
const sizeClasses = {
  sm: "w-8 h-8 text-sm",
  md: "w-12 h-12 text-lg",
  lg: "w-24 h-24 text-3xl",
};

// Preset avatar SVG icons (adventure-themed)
const PresetIcons: Record<PresetAvatarId, ReactElement> = {
  hiker: (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full p-1">
      <path d="M12 2C13.1 2 14 2.9 14 4S13.1 6 12 6 10 5.1 10 4 10.9 2 12 2M21 9H15V22H13V16H11V22H9V9H3V7H21V9Z" />
    </svg>
  ),
  camper: (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full p-1">
      <path d="M12 3L2 12H5V20H19V12H22L12 3M12 8.75A2.25 2.25 0 0 1 14.25 11A2.25 2.25 0 0 1 12 13.25A2.25 2.25 0 0 1 9.75 11A2.25 2.25 0 0 1 12 8.75Z" />
    </svg>
  ),
  explorer: (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full p-1">
      <path d="M12 2C6.5 2 2 6.5 2 12S6.5 22 12 22 22 17.5 22 12 17.5 2 12 2M12 4C16.4 4 20 7.6 20 12S16.4 20 12 20 4 16.4 4 12 7.6 4 12 4M6.5 17.5L14.5 14.5L17.5 6.5L9.5 9.5L6.5 17.5M12 10A2 2 0 0 0 10 12A2 2 0 0 0 12 14A2 2 0 0 0 14 12A2 2 0 0 0 12 10Z" />
    </svg>
  ),
  photographer: (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full p-1">
      <path d="M4 4H7L9 2H15L17 4H20C21.1 4 22 4.9 22 6V18C22 19.1 21.1 20 20 20H4C2.9 20 2 19.1 2 18V6C2 4.9 2.9 4 4 4M12 7A5 5 0 0 0 7 12A5 5 0 0 0 12 17A5 5 0 0 0 17 12A5 5 0 0 0 12 7M12 9A3 3 0 0 1 15 12A3 3 0 0 1 12 15A3 3 0 0 1 9 12A3 3 0 0 1 12 9Z" />
    </svg>
  ),
  mountain: (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full p-1">
      <path d="M12 4L2 20H22L12 4M12 8.2L16.5 16H7.5L12 8.2Z" />
    </svg>
  ),
  compass: (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full p-1">
      <path d="M12 2A10 10 0 0 0 2 12A10 10 0 0 0 12 22A10 10 0 0 0 22 12A10 10 0 0 0 12 2M12 4A8 8 0 0 1 20 12A8 8 0 0 1 12 20A8 8 0 0 1 4 12A8 8 0 0 1 12 4M6.5 17.5L14.5 14.5L17.5 6.5L9.5 9.5L6.5 17.5M12 10A2 2 0 0 0 10 12A2 2 0 0 0 12 14A2 2 0 0 0 14 12A2 2 0 0 0 12 10Z" />
    </svg>
  ),
  backpack: (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full p-1">
      <path d="M12 2A3 3 0 0 0 9 5V6H7A2 2 0 0 0 5 8V19A3 3 0 0 0 8 22H16A3 3 0 0 0 19 19V8A2 2 0 0 0 17 6H15V5A3 3 0 0 0 12 2M11 5A1 1 0 0 1 12 4A1 1 0 0 1 13 5V6H11V5M7 8H17V19A1 1 0 0 1 16 20H8A1 1 0 0 1 7 19V8M9 10V12H15V10H9M9 14V16H15V14H9Z" />
    </svg>
  ),
  tent: (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full p-1">
      <path d="M12 2L2 19H6L12 7L18 19H22L12 2M7.5 19L12 11L16.5 19H13V15H11V19H7.5Z" />
    </svg>
  ),
};

// Generate a color based on a string (for consistent letter avatar colors)
const stringToColor = (str: string): string => {
  const colors = [
    "#2563eb", // blue
    "#7c3aed", // violet
    "#db2777", // pink
    "#ea580c", // orange
    "#16a34a", // green
    "#0891b2", // cyan
    "#4f46e5", // indigo
    "#dc2626", // red
  ];
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

const ProfileAvatar: FC<ProfileAvatarProps> = ({
  avatarUrl,
  username,
  email,
  size = "md",
  className = "",
}) => {
  // Determine display name for letter avatar
  const displayName = username || email || "U";
  const firstLetter = displayName.charAt(0).toUpperCase();
  const defaultColor = stringToColor(displayName);

  // Parse the avatar URL
  const parsed = parseAvatarUrl(avatarUrl);

  // Determine background color
  const bgColor = parsed.color || defaultColor;

  const handleImageError = (e: SyntheticEvent<HTMLImageElement, Event>) => {
    // Hide broken image, parent will show letter fallback
    e.currentTarget.style.display = "none";
  };

  return (
    <div
      className={`rounded-full overflow-hidden flex items-center justify-center font-bold text-white ${sizeClasses[size]} ${className}`}
      style={{ backgroundColor: bgColor }}
    >
      {parsed.type === "image" ? (
        <img
          src={avatarUrl!}
          alt={displayName}
          className="w-full h-full object-cover"
          onError={handleImageError}
        />
      ) : parsed.type === "preset" && parsed.icon && PresetIcons[parsed.icon] ? (
        PresetIcons[parsed.icon]
      ) : (
        <span>{firstLetter}</span>
      )}
    </div>
  );
};

export default ProfileAvatar;

// Export preset icons for use in AvatarPicker
export { PresetIcons };
