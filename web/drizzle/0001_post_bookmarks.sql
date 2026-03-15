CREATE TABLE `post_bookmarks` (
	`post_id` text NOT NULL,
	`user_id` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`post_id`) REFERENCES `posts`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	PRIMARY KEY(`post_id`, `user_id`)
);
--> statement-breakpoint
CREATE INDEX `post_bookmarks_user_id_idx` ON `post_bookmarks` (`user_id`);
