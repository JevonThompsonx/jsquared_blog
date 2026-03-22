-- 6.D.1: Add missing indexes on FK columns (SQLite does not auto-index FK columns)
CREATE INDEX `comments_post_id_idx` ON `comments` (`post_id`);
--> statement-breakpoint
CREATE INDEX `comments_author_id_idx` ON `comments` (`author_id`);
--> statement-breakpoint
CREATE INDEX `post_images_post_id_idx` ON `post_images` (`post_id`);
--> statement-breakpoint
CREATE INDEX `post_images_media_asset_id_idx` ON `post_images` (`media_asset_id`);
--> statement-breakpoint
CREATE INDEX `posts_category_id_idx` ON `posts` (`category_id`);
--> statement-breakpoint
CREATE INDEX `auth_accounts_user_id_idx` ON `auth_accounts` (`user_id`);
--> statement-breakpoint
CREATE INDEX `media_assets_owner_user_id_idx` ON `media_assets` (`owner_user_id`);
--> statement-breakpoint
-- 6.D.2: Composite index for published feed query (WHERE status='published' ORDER BY published_at DESC)
CREATE INDEX `posts_status_published_at_idx` ON `posts` (`status`, `published_at`);
--> statement-breakpoint
-- 6.D.3: Index for scheduled-publish cron (WHERE scheduled_publish_time <= now AND status='scheduled')
CREATE INDEX `posts_scheduled_publish_time_idx` ON `posts` (`scheduled_publish_time`);
