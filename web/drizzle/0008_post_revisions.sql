CREATE TABLE `post_revisions` (
	`id` text PRIMARY KEY NOT NULL,
	`post_id` text NOT NULL,
	`revision_num` integer NOT NULL,
	`title` text NOT NULL,
	`content_json` text NOT NULL,
	`excerpt` text,
	`saved_by_user_id` text NOT NULL,
	`saved_at` integer NOT NULL,
	`label` text,
	FOREIGN KEY (`post_id`) REFERENCES `posts`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`saved_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `post_revisions_post_id_revision_num_idx` ON `post_revisions` (`post_id`,`revision_num`);
--> statement-breakpoint
CREATE INDEX `post_revisions_post_id_saved_at_idx` ON `post_revisions` (`post_id`,`saved_at`);
