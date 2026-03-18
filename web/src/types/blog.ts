export type BlogTag = {
  id: string;
  name: string;
  slug: string;
};

export type BlogImage = {
  id: string;
  imageUrl: string;
  altText: string | null;
  sortOrder: number;
};

export type BlogPost = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  excerpt: string | null;
  imageUrl: string | null;
  category: string | null;
  createdAt: string;
  updatedAt?: string;
  publishedAt?: string | null;
  status: "draft" | "published" | "scheduled";
  layoutType?: "standard" | "split-horizontal" | "split-vertical" | "hover";
  tags: BlogTag[];
  images: BlogImage[];
  source: "turso";
  locationName: string | null;
  locationLat: number | null;
  locationLng: number | null;
  locationZoom: number | null;
  iovanderUrl: string | null;
  commentCount: number;
  authorId?: string;
  readingTimeMinutes?: number;
};
