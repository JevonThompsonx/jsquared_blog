ALTER TABLE `posts` ADD COLUMN `content_format` text DEFAULT 'tiptap-json' NOT NULL;
--> statement-breakpoint
ALTER TABLE `posts` ADD COLUMN `content_html` text;
--> statement-breakpoint
ALTER TABLE `posts` ADD COLUMN `content_plain_text` text;
--> statement-breakpoint
UPDATE `posts`
SET
  `content_format` = CASE
    WHEN json_valid(`content_json`) = 1 AND json_extract(`content_json`, '$.type') = 'legacy-html' THEN 'legacy-html'
    ELSE 'tiptap-json'
  END,
  `content_html` = CASE
    WHEN json_valid(`content_json`) = 1 AND json_extract(`content_json`, '$.type') = 'legacy-html' THEN json_extract(`content_json`, '$.html')
    ELSE NULL
  END,
  `content_plain_text` = NULL;
--> statement-breakpoint
CREATE INDEX `posts_content_format_idx` ON `posts` (`content_format`);
--> statement-breakpoint
CREATE TABLE `post_preview_tokens` (
	`id` text PRIMARY KEY NOT NULL,
	`token_hash` text NOT NULL,
	`post_id` text NOT NULL,
	`issued_by_user_id` text NOT NULL,
	`expires_at` integer NOT NULL,
	`revoked_at` integer,
	`last_used_at` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`post_id`) REFERENCES `posts`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`issued_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `post_preview_tokens_token_hash_unique` ON `post_preview_tokens` (`token_hash`);
--> statement-breakpoint
CREATE INDEX `post_preview_tokens_token_hash_idx` ON `post_preview_tokens` (`token_hash`);
--> statement-breakpoint
CREATE INDEX `post_preview_tokens_post_id_idx` ON `post_preview_tokens` (`post_id`);
--> statement-breakpoint
CREATE INDEX `post_preview_tokens_issued_by_user_id_idx` ON `post_preview_tokens` (`issued_by_user_id`);
--> statement-breakpoint
CREATE INDEX `post_preview_tokens_expires_at_idx` ON `post_preview_tokens` (`expires_at`);
