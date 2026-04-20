-- Migration 0019: Add is_pinned column to wishlist_places
ALTER TABLE wishlist_places ADD COLUMN is_pinned INTEGER NOT NULL DEFAULT 0;
