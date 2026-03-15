ALTER TABLE `posts` ADD COLUMN `location_name` text;
--> statement-breakpoint
ALTER TABLE `posts` ADD COLUMN `location_lat` real;
--> statement-breakpoint
ALTER TABLE `posts` ADD COLUMN `location_lng` real;
--> statement-breakpoint
ALTER TABLE `posts` ADD COLUMN `location_zoom` integer;
--> statement-breakpoint
ALTER TABLE `posts` ADD COLUMN `ioverlander_url` text;
