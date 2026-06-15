ALTER TABLE `post_revisions` ADD COLUMN `layout_type` text;--> statement-breakpoint
ALTER TABLE `post_revisions` ADD COLUMN `category_id` text REFERENCES categories(id);--> statement-breakpoint
ALTER TABLE `post_revisions` ADD COLUMN `featured_image_id` text REFERENCES media_assets(id);--> statement-breakpoint
ALTER TABLE `post_revisions` ADD COLUMN `location_name` text;--> statement-breakpoint
ALTER TABLE `post_revisions` ADD COLUMN `location_lat` real;--> statement-breakpoint
ALTER TABLE `post_revisions` ADD COLUMN `location_lng` real;--> statement-breakpoint
ALTER TABLE `post_revisions` ADD COLUMN `location_zoom` integer;
