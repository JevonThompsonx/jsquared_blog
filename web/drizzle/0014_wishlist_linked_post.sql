ALTER TABLE `wishlist_places` ADD `linked_post_id` text REFERENCES posts(id) ON DELETE SET NULL;
