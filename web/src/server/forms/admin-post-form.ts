import { z } from "zod";

export const adminPostFormSchema = z
  .object({
    title: z.string().trim().min(1, "Title is required"),
    slug: z.string().trim().optional().default(""),
    excerpt: z.string().trim().max(280, "Excerpt must be 280 characters or fewer").optional().default(""),
    categoryName: z.string().trim().optional().default(""),
    tagNames: z.string().trim().optional().default(""),
    status: z.enum(["draft", "published", "scheduled"]),
    layoutType: z.enum(["standard", "split-horizontal", "split-vertical", "hover"]),
    scheduledPublishTime: z.string().trim().optional().default(""),
    featuredImageUrl: z.string().trim().optional().default(""),
    featuredImageAlt: z.string().trim().optional().default(""),
    galleryEntries: z.string().trim().optional().default("[]"),
    contentHtml: z.string().trim().min(1, "Content is required"),
  })
  .superRefine((value, ctx) => {
    if (value.status === "scheduled") {
      if (!value.scheduledPublishTime) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Scheduled publish time is required for scheduled posts",
          path: ["scheduledPublishTime"],
        });
        return;
      }

      if (Number.isNaN(new Date(value.scheduledPublishTime).getTime())) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Scheduled publish time is invalid",
          path: ["scheduledPublishTime"],
        });
      }
    }
  });

export type AdminPostFormValues = z.infer<typeof adminPostFormSchema>;
