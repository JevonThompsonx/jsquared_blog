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
  status?: "draft" | "published" | "scheduled";
  layoutType?: "standard" | "split-horizontal" | "split-vertical" | "hover";
  tags: BlogTag[];
  images: BlogImage[];
  source: "turso";
};
