import { z } from "zod";

const newsletterEmailSchema = z
  .string()
  .trim()
  .email("Enter a valid email address")
  .transform((value) => value.toLowerCase());

export const subscribeToNewsletterSchema = z.object({
  email: newsletterEmailSchema,
  firstName: z.string().trim().min(1).max(100).optional(),
  lastName: z.string().trim().min(1).max(100).optional(),
  source: z.string().trim().min(1).max(100).optional(),
});

export type SubscribeToNewsletterValues = z.infer<typeof subscribeToNewsletterSchema>;
