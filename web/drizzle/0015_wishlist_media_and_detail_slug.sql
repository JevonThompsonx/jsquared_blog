ALTER TABLE `wishlist_places` ADD `visited_year` integer;
--> statement-breakpoint
ALTER TABLE `wishlist_places` ADD `image_url` text;
--> statement-breakpoint
ALTER TABLE `wishlist_places` ADD `detail_slug` text;
--> statement-breakpoint
CREATE UNIQUE INDEX `wishlist_places_detail_slug_unique` ON `wishlist_places` (`detail_slug`);
