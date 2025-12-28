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
