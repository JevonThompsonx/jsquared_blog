import { z } from "zod";

export const commentSortSchema = z.enum(["likes", "newest", "oldest"]);

export const createCommentSchema = z.object({
  content: z.string().trim().min(1, "Comment is required").max(2000, "Comment is too long"),
  parentId: z.string().uuid().optional(),
});

export type CommentSortOption = z.infer<typeof commentSortSchema>;
export type CreateCommentValues = z.infer<typeof createCommentSchema>;
