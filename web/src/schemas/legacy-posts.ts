import { z } from "zod";

export const legacyTagSchema = z.object({
  id: z.number(),
  name: z.string(),
  slug: z.string(),
});

export const legacyImageSchema = z.object({
  id: z.number().optional(),
  image_url: z.string().url(),
  alt_text: z.string().nullable().optional(),
  focal_point: z.string().nullable().optional(),
  sort_order: z.number().optional(),
});

export const legacyPostSchema = z.object({
  id: z.number(),
  created_at: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  image_url: z.string().nullable().optional(),
  category: z.string().nullable().optional(),
  type: z.enum(["split-horizontal", "split-vertical", "hover"]).optional(),
  status: z.enum(["draft", "published", "scheduled"]).optional(),
  tags: z.array(legacyTagSchema).optional().default([]),
  images: z.array(legacyImageSchema).optional().default([]),
});

export const legacyPostListSchema = z.object({
  posts: z.array(legacyPostSchema),
  total: z.number().nullable().optional(),
  limit: z.number().optional(),
  offset: z.number().optional(),
  hasMore: z.boolean().optional(),
});

export type LegacyPost = z.infer<typeof legacyPostSchema>;
