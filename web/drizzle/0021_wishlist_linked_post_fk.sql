-- Migration 0021: Add FK constraint and index on wishlist_places.linked_post_id
--
-- The original `linked_post_id` column was added in migration 0014 with an
-- inline `REFERENCES posts(id)` clause, but SQLite does not enforce
-- column-level REFERENCES on ALTER TABLE ADD COLUMN — it parses the
-- clause but does not create the constraint. This migration rebuilds
-- the table to actually enforce the FK.
--
-- We also add an index on linked_post_id since the FK creates a lookup
-- path (especially for `JOIN posts ON wishlist_places.linked_post_id`).

PRAGMA foreign_keys=OFF;
--> statement-breakpoint
CREATE TABLE `__new_wishlist_places` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`location_name` text NOT NULL,
	`description` text,
	`location_lat` real NOT NULL,
	`location_lng` real NOT NULL,
	`location_zoom` integer DEFAULT 8 NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`visited` integer DEFAULT false NOT NULL,
	`is_public` integer DEFAULT false NOT NULL,
	`external_url` text,
	`visited_year` integer,
	`image_url` text,
	`detail_slug` text,
	`linked_post_id` text REFERENCES posts(id) ON UPDATE no action ON DELETE set null,
	`item_type` text DEFAULT 'single' NOT NULL,
	`detail_level` text DEFAULT 'full_page' NOT NULL,
	`is_pinned` integer DEFAULT false NOT NULL,
	`parent_id` text REFERENCES wishlist_places(id) ON UPDATE no action ON DELETE no action,
	`created_by_user_id` text NOT NULL REFERENCES users(id) ON UPDATE no action ON DELETE no action,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_wishlist_places` (
	`id`, `name`, `location_name`, `description`, `location_lat`, `location_lng`,
	`location_zoom`, `sort_order`, `visited`, `is_public`, `external_url`, `visited_year`,
	`image_url`, `detail_slug`, `linked_post_id`, `item_type`, `detail_level`, `is_pinned`,
	`parent_id`, `created_by_user_id`, `created_at`, `updated_at`
) SELECT
	`id`, `name`, `location_name`, `description`, `location_lat`, `location_lng`,
	`location_zoom`, `sort_order`, `visited`, `is_public`, `external_url`, `visited_year`,
	`image_url`, `detail_slug`, `linked_post_id`, `item_type`, `detail_level`, `is_pinned`,
	`parent_id`, `created_by_user_id`, `created_at`, `updated_at`
FROM `wishlist_places`;
--> statement-breakpoint
DROP TABLE `wishlist_places`;
--> statement-breakpoint
ALTER TABLE `__new_wishlist_places` RENAME TO `wishlist_places`;
--> statement-breakpoint
-- Recreate indexes that the table rebuild dropped
CREATE INDEX `wishlist_places_created_by_user_id_idx` ON `wishlist_places` (`created_by_user_id`);
--> statement-breakpoint
CREATE INDEX `wishlist_places_sort_order_idx` ON `wishlist_places` (`sort_order`);
--> statement-breakpoint
CREATE INDEX `wishlist_places_is_public_idx` ON `wishlist_places` (`is_public`);
--> statement-breakpoint
CREATE INDEX `wishlist_places_parent_id_idx` ON `wishlist_places` (`parent_id`);
--> statement-breakpoint
CREATE INDEX `wishlist_places_item_type_idx` ON `wishlist_places` (`item_type`);
--> statement-breakpoint
CREATE UNIQUE INDEX `wishlist_places_detail_slug_unique` ON `wishlist_places` (`detail_slug`);
--> statement-breakpoint
-- New index for linked_post_id
CREATE INDEX `wishlist_places_linked_post_id_idx` ON `wishlist_places` (`linked_post_id`);
