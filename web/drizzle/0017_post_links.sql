-- Add post_links table for multiple external links per post
CREATE TABLE `post_links` (
  `id` text PRIMARY KEY NOT NULL,
  `post_id` text NOT NULL REFERENCES `posts`(`id`),
  `label` text NOT NULL,
  `url` text NOT NULL,
  `sort_order` integer NOT NULL DEFAULT 0,
  `created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `post_links_post_id_idx` ON `post_links` (`post_id`);
