-- Migration 0022: Schema hardening — audit timestamps and remaining indexes
--
-- Changes:
--   1. series: add updated_at (rebuild to enforce NOT NULL)
--   2. categories: add created_at, updated_at (rebuild to enforce NOT NULL)
--   3. tags: add created_at, updated_at (rebuild to enforce NOT NULL)
--   4. post_tags: add index on tag_id (speeds up tag-listing queries)
--
-- Note: the FK on wishlist_places.parent_id already exists in the DB; the
-- Drizzle schema declaration was updated to match in this branch but no
-- migration is needed.
--
-- SQLite does not support ADD COLUMN with non-constant default, so we
-- rebuild the affected tables. The DROP TABLE fails when the table is
-- referenced by FKs in other tables (e.g. posts.category_id references
-- categories), so we disable FK enforcement for the duration.

PRAGMA foreign_keys=OFF;
--> statement-breakpoint

-- Step 1: Add updated_at to series (rebuild to enforce NOT NULL)
CREATE TABLE `__new_series` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`slug` text NOT NULL,
	`description` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_series` (`id`, `title`, `slug`, `description`, `created_at`, `updated_at`)
SELECT `id`, `title`, `slug`, `description`, `created_at`, `created_at` FROM `series`;
--> statement-breakpoint
DROP TABLE `series`;
--> statement-breakpoint
ALTER TABLE `__new_series` RENAME TO `series`;
--> statement-breakpoint
-- Recreate the unique index that was dropped
CREATE UNIQUE INDEX `series_slug_unique` ON `series` (`slug`);
--> statement-breakpoint

-- Step 2: Add created_at and updated_at to categories (rebuild for NOT NULL)
CREATE TABLE `__new_categories` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`description` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_categories` (`id`, `name`, `slug`, `description`, `created_at`, `updated_at`)
SELECT `id`, `name`, `slug`, `description`, (strftime('%s','now') * 1000), (strftime('%s','now') * 1000) FROM `categories`;
--> statement-breakpoint
DROP TABLE `categories`;
--> statement-breakpoint
ALTER TABLE `__new_categories` RENAME TO `categories`;
--> statement-breakpoint
CREATE UNIQUE INDEX `categories_slug_unique` ON `categories` (`slug`);
--> statement-breakpoint

-- Step 3: Add created_at and updated_at to tags (rebuild for NOT NULL)
CREATE TABLE `__new_tags` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`description` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_tags` (`id`, `name`, `slug`, `description`, `created_at`, `updated_at`)
SELECT `id`, `name`, `slug`, `description`, (strftime('%s','now') * 1000), (strftime('%s','now') * 1000) FROM `tags`;
--> statement-breakpoint
DROP TABLE `tags`;
--> statement-breakpoint
ALTER TABLE `__new_tags` RENAME TO `tags`;
--> statement-breakpoint
CREATE UNIQUE INDEX `tags_slug_unique` ON `tags` (`slug`);
--> statement-breakpoint

PRAGMA foreign_keys=ON;
--> statement-breakpoint

-- Step 4: Add index on post_tags.tag_id (speeds up tag-listing queries)
CREATE INDEX `post_tags_tag_id_idx` ON `post_tags` (`tag_id`);
