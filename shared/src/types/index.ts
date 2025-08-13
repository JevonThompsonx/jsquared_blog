export type ThemeName =
  | "midnightGarden"
  | "daylightGarden"
  | "enchantedForest"
  | "daylitForest";

export type PostType = "horizontal" | "vertical" | "hover";

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
