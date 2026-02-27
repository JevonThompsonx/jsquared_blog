/**
 * Shared Zod schemas for API validation.
 * Used by both server (input validation) and client (form validation).
 * Import these instead of writing ad-hoc validation in route handlers.
 */
import { z } from "zod";

// ─── Primitive enums (reuse across schemas) ───────────────────────────────────

export const postStatusSchema = z.enum(["draft", "published", "scheduled"]);

export const postTypeSchema = z.enum([
  "split-horizontal",
  "split-vertical",
  "hover",
]);

export const commentSortSchema = z.enum(["likes", "newest", "oldest"]);

// ─── Pagination query params ──────────────────────────────────────────────────

export const paginationQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
  search: z.string().max(200).optional().default(""),
  status: z.string().optional().default(""),
});

export type PaginationQuery = z.infer<typeof paginationQuerySchema>;

// ─── Post creation ────────────────────────────────────────────────────────────

// Normalise empty strings from HTML forms/JSON bodies to null.
// This prevents `.url()` and other validators from rejecting "" when the
// field was intentionally left blank.
const emptyStringToNull = <T>(v: T) => (v === "" ? null : v);

/**
 * Schema for validating POST /api/posts JSON body.
 * File uploads are handled separately (FormData with a File field).
 */
export const createPostBodySchema = z
  .object({
    title: z.string().max(500).optional().default(""),
    description: z.preprocess(emptyStringToNull, z.string().max(100_000).optional().nullable()),
    category: z.preprocess(emptyStringToNull, z.string().max(100).optional().nullable()),
    status: postStatusSchema.default("published"),
    // Accept ISO strings; the date-validity check is done in superRefine.
    scheduled_for: z.preprocess(emptyStringToNull, z.string().optional().nullable()),
    image_url: z.preprocess(emptyStringToNull, z.string().url().optional().nullable()),
  })
  .superRefine((data, ctx) => {
    if (
      data.status === "published" &&
      (!data.title || data.title.trim() === "")
    ) {
      ctx.addIssue({
        code: "custom",
        message: "Title is required for published posts",
        path: ["title"],
      });
    }
    if (data.status === "scheduled") {
      if (!data.scheduled_for) {
        ctx.addIssue({
          code: "custom",
          message: "scheduled_for is required when status is 'scheduled'",
          path: ["scheduled_for"],
        });
      } else {
        const scheduledDate = new Date(data.scheduled_for);
        if (isNaN(scheduledDate.getTime())) {
          ctx.addIssue({
            code: "custom",
            message: "scheduled_for must be a valid date",
            path: ["scheduled_for"],
          });
        } else if (scheduledDate <= new Date()) {
          ctx.addIssue({
            code: "custom",
            message: "scheduled_for must be in the future",
            path: ["scheduled_for"],
          });
        }
      }
    }
  });

export type CreatePostBody = z.infer<typeof createPostBodySchema>;

// ─── Post update ──────────────────────────────────────────────────────────────

export const updatePostBodySchema = z
  .object({
    title: z.preprocess(emptyStringToNull, z.string().max(500).optional().nullable()),
    description: z.preprocess(emptyStringToNull, z.string().max(100_000).optional().nullable()),
    category: z.preprocess(emptyStringToNull, z.string().max(100).optional().nullable()),
    status: postStatusSchema.optional(),
    scheduled_for: z.preprocess(emptyStringToNull, z.string().optional().nullable()),
    image_url: z.preprocess(emptyStringToNull, z.string().url().optional().nullable()),
    type: postTypeSchema.optional().nullable(),
    grid_class: z.preprocess(emptyStringToNull, z.string().optional().nullable()),
  })
  .superRefine((data, ctx) => {
    if (
      data.status === "published" &&
      data.title !== undefined &&
      (!data.title || data.title.trim() === "")
    ) {
      ctx.addIssue({
        code: "custom",
        message: "Title is required for published posts",
        path: ["title"],
      });
    }
    if (data.status === "scheduled") {
      if (!data.scheduled_for) {
        ctx.addIssue({
          code: "custom",
          message: "scheduled_for is required when status is 'scheduled'",
          path: ["scheduled_for"],
        });
      } else {
        const scheduledDate = new Date(data.scheduled_for);
        if (isNaN(scheduledDate.getTime())) {
          ctx.addIssue({
            code: "custom",
            message: "scheduled_for must be a valid date",
            path: ["scheduled_for"],
          });
        } else if (scheduledDate <= new Date()) {
          ctx.addIssue({
            code: "custom",
            message: "scheduled_for must be in the future",
            path: ["scheduled_for"],
          });
        }
      }
    }
  });

export type UpdatePostBody = z.infer<typeof updatePostBodySchema>;

// ─── Comments ─────────────────────────────────────────────────────────────────

export const createCommentBodySchema = z.object({
  // .trim() before .min() ensures whitespace-only content fails the min(1) check.
  content: z.string().trim().min(1, "Comment cannot be empty").max(5000),
});

export type CreateCommentBody = z.infer<typeof createCommentBodySchema>;

// ─── Tags ─────────────────────────────────────────────────────────────────────

export const createTagBodySchema = z.object({
  name: z.string().min(1).max(100).trim(),
  slug: z.string().min(1).max(100).toLowerCase().trim(),
});

export type CreateTagBody = z.infer<typeof createTagBodySchema>;

export const updatePostTagsBodySchema = z.object({
  tagIds: z.array(z.number().int().positive()),
});

export type UpdatePostTagsBody = z.infer<typeof updatePostTagsBodySchema>;

// ─── Profile / Account settings ──────────────────────────────────────────────

export const updateProfileBodySchema = z.object({
  username: z.string().min(1).max(50).trim().optional().nullable(),
  avatar_url: z.string().url().optional().nullable(),
  theme_preference: z
    .enum(["midnightGarden", "daylightGarden", "enchantedForest", "daylitForest"])
    .optional(),
  date_format_preference: z.enum(["relative", "absolute"]).optional(),
});

export type UpdateProfileBody = z.infer<typeof updateProfileBodySchema>;
