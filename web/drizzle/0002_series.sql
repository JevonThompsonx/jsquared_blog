CREATE TABLE IF NOT EXISTS `series` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`slug` text NOT NULL,
	`description` text,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `series_slug_idx` ON `series` (`slug`);
--> statement-breakpoint
ALTER TABLE `posts` ADD COLUMN `series_id` text REFERENCES `series`(`id`);
--> statement-breakpoint
ALTER TABLE `posts` ADD COLUMN `series_order` integer;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `posts_series_id_idx` ON `posts` (`series_id`);
