import { z } from "zod";

const textIdSchema = z
  .string()
  .trim()
  .min(1, "ID is required")
  .max(64, "ID is too long")
  .regex(/^[A-Za-z0-9_-]+$/, "Invalid ID");

export const commentSortSchema = z.enum(["likes", "newest", "oldest"]);
export const commentVisibilitySchema = z.enum(["visible", "hidden", "deleted"]);
export const commentModerationActionSchema = z.enum(["hide", "unhide", "delete", "flag", "unflag"]);
export const commentIdSchema = textIdSchema;
export const postIdSchema = textIdSchema;
export const postCommentsParamsSchema = z.object({
  postId: postIdSchema,
});

export const createCommentSchema = z.object({
  content: z.string().trim().min(1, "Comment is required").max(2000, "Comment is too long"),
  parentId: commentIdSchema.optional(),
});

export const moderateCommentsSchema = z.object({
  commentIds: z.array(commentIdSchema).min(1).max(100),
  action: commentModerationActionSchema,
});

export type CommentSortOption = z.infer<typeof commentSortSchema>;
export type CreateCommentValues = z.infer<typeof createCommentSchema>;
export type CommentVisibility = z.infer<typeof commentVisibilitySchema>;
export type CommentModerationAction = z.infer<typeof commentModerationActionSchema>;
