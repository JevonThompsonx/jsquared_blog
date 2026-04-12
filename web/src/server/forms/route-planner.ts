import { z } from "zod";

const routeLocationSchema = z.string().trim().min(1).max(200);

const routePlannerModeSchema = z.enum(["drive", "walk", "bike"]);

export const routePlannerRequestSchema = z.object({
  source: z.literal("public-wishlist"),
  origin: routeLocationSchema,
  destination: routeLocationSchema,
  mode: routePlannerModeSchema.default("drive"),
  includeVisited: z.boolean().optional().default(false),
});

export type RoutePlannerRequest = z.infer<typeof routePlannerRequestSchema>;
