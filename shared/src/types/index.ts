export type ThemeName =
  | "midnightGarden"
  | "daylightGarden"
  | "enchantedForest"
  | "daylitForest";

export type PostType = "split-horizontal" | "split-vertical" | "hover";

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
};
