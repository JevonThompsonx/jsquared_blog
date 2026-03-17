ALTER TABLE `comments` ADD COLUMN `visibility` text DEFAULT 'visible' NOT NULL;
--> statement-breakpoint
ALTER TABLE `comments` ADD COLUMN `is_flagged` integer DEFAULT false NOT NULL;
--> statement-breakpoint
ALTER TABLE `comments` ADD COLUMN `moderated_at` integer;
--> statement-breakpoint
ALTER TABLE `comments` ADD COLUMN `moderated_by_user_id` text REFERENCES `users`(`id`);
