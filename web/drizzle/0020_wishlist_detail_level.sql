-- Add detail_level to wishlist_places for single site detail page control
ALTER TABLE `wishlist_places` ADD `detail_level` text NOT NULL DEFAULT 'full_page';
