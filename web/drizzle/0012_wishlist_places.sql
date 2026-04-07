CREATE TABLE `wishlist_places` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`location_name` text NOT NULL,
	`location_lat` real NOT NULL,
	`location_lng` real NOT NULL,
	`location_zoom` integer DEFAULT 8 NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`visited` integer DEFAULT false NOT NULL,
	`is_public` integer DEFAULT false NOT NULL,
	`external_url` text,
	`created_by_user_id` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`created_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `wishlist_places_created_by_user_id_idx` ON `wishlist_places` (`created_by_user_id`);
--> statement-breakpoint
CREATE INDEX `wishlist_places_sort_order_idx` ON `wishlist_places` (`sort_order`);
--> statement-breakpoint
CREATE INDEX `wishlist_places_is_public_idx` ON `wishlist_places` (`is_public`);
