-- Add seasons table for admin-customizable season display names
CREATE TABLE `seasons` (
  `id` text PRIMARY KEY NOT NULL,
  `season_key` text NOT NULL,
  `display_name` text NOT NULL,
  `created_by_user_id` text NOT NULL REFERENCES `users`(`id`),
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `seasons_season_key_unique` ON `seasons` (`season_key`);
--> statement-breakpoint
CREATE INDEX `seasons_created_by_user_id_idx` ON `seasons` (`created_by_user_id`);
