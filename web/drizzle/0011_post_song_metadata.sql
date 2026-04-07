ALTER TABLE `posts` ADD COLUMN `song_title` text;
--> statement-breakpoint
ALTER TABLE `posts` ADD COLUMN `song_artist` text;
--> statement-breakpoint
ALTER TABLE `posts` ADD COLUMN `song_url` text;
--> statement-breakpoint
ALTER TABLE `post_revisions` ADD COLUMN `song_title` text;
--> statement-breakpoint
ALTER TABLE `post_revisions` ADD COLUMN `song_artist` text;
--> statement-breakpoint
ALTER TABLE `post_revisions` ADD COLUMN `song_url` text;
