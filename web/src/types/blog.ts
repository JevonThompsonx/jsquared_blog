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
  exifTakenAt?: Date | null;
  exifLat?: number | null;
  exifLng?: number | null;
  exifCameraMake?: string | null;
  exifCameraModel?: string | null;
  exifLensModel?: string | null;
  exifAperture?: number | null;
  exifShutterSpeed?: string | null;
  exifIso?: number | null;
};

export type BlogSongMetadata = {
  title: string | null;
  artist: string | null;
  url: string;
};

export type BlogPostLink = {
  id: string;
  postId: string;
  label: string;
  url: string;
  sortOrder: number;
  createdAt: Date;
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
  links?: BlogPostLink[];
  song?: BlogSongMetadata | null;
  viewCount?: number;
  commentCount: number;
  authorId?: string;
  readingTimeMinutes?: number;
};
