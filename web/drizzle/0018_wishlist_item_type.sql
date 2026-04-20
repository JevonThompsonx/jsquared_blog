-- Add item_type and parent_id to wishlist_places for single/multi-site support
ALTER TABLE `wishlist_places` ADD `item_type` text NOT NULL DEFAULT 'single';
--> statement-breakpoint
ALTER TABLE `wishlist_places` ADD `parent_id` text REFERENCES `wishlist_places`(`id`);
--> statement-breakpoint
CREATE INDEX `wishlist_places_parent_id_idx` ON `wishlist_places` (`parent_id`);
--> statement-breakpoint
CREATE INDEX `wishlist_places_item_type_idx` ON `wishlist_places` (`item_type`);
