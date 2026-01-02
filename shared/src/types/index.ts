export type ThemeName =
  | "midnightGarden"
  | "daylightGarden"
  | "enchantedForest"
  | "daylitForest";

export type PostType = "split-horizontal" | "split-vertical" | "hover";

export type PostStatus = "draft" | "published";

// Predefined categories for travel blog
export const CATEGORIES = [
  "Hiking",
  "Camping",
  "Food",
  "Nature",
  "Culture",
  "Water Sports",
  "Biking",
  "Road Trip",
  "City Adventure",
  "Wildlife",
  "Beach",
  "Mountains",
  "Photography",
  "Winter Sports",
  "Other"
] as const;

export type Category = typeof CATEGORIES[number];

export type Post = {
  id: number;
  created_at: string;
  title: string;
  description: string | null;
  image_url: string | null;
  category: string | null;
  author_id: string;
  type: PostType; // Matches database column name
  status: PostStatus; // draft or published
};

export type PostImage = {
  id: number;
  post_id: number;
  image_url: string;
  sort_order: number;
  created_at: string;
  focal_point?: string; // CSS object-position value, e.g., "50% 30%" or "center top"
};

export type PostWithImages = Post & {
  images?: PostImage[];
};

export type Article = {
  id: number;
  image: string;
  category: string;
  title: string;
  description: string;
  date: string;
  gridClass: string;
  dynamicViewType: PostType; // Added this
  status: PostStatus; // draft or published
};

export type Comment = {
  id: number;
  created_at: string;
  updated_at: string;
  content: string;
  post_id: number;
  user_id: string;
  user_email?: string; // Joined from profiles/auth.users
  like_count: number; // Aggregated count
  user_has_liked: boolean; // Whether current user has liked this comment
};

export type CommentLike = {
  id: number;
  created_at: string;
  comment_id: number;
  user_id: string;
};

export type CommentSortOption = "likes" | "newest" | "oldest";

// User profile types
export type UserProfile = {
  id: string;
  username: string | null;
  avatar_url: string | null;
  role: "admin" | "viewer";
  theme_preference?: ThemeName;
};

// Preset avatar icons (adventure-themed)
export const PRESET_AVATARS = [
  { id: "hiker", label: "Hiker" },
  { id: "camper", label: "Camper" },
  { id: "explorer", label: "Explorer" },
  { id: "photographer", label: "Photographer" },
  { id: "mountain", label: "Mountain" },
  { id: "compass", label: "Compass" },
  { id: "backpack", label: "Backpack" },
  { id: "tent", label: "Tent" },
] as const;

export type PresetAvatarId = typeof PRESET_AVATARS[number]["id"];

// Avatar color options
export const AVATAR_COLORS = [
  { id: "blue", hex: "#2563eb", label: "Blue" },
  { id: "violet", hex: "#7c3aed", label: "Violet" },
  { id: "pink", hex: "#db2777", label: "Pink" },
  { id: "orange", hex: "#ea580c", label: "Orange" },
  { id: "green", hex: "#16a34a", label: "Green" },
  { id: "cyan", hex: "#0891b2", label: "Cyan" },
  { id: "indigo", hex: "#4f46e5", label: "Indigo" },
  { id: "red", hex: "#dc2626", label: "Red" },
  { id: "teal", hex: "#0d9488", label: "Teal" },
  { id: "amber", hex: "#d97706", label: "Amber" },
] as const;

export type AvatarColorHex = typeof AVATAR_COLORS[number]["hex"];
