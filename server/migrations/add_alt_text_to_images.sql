-- Migration: Add alt_text column to post_images table
-- This improves accessibility by allowing per-image alt text descriptions

ALTER TABLE post_images ADD COLUMN IF NOT EXISTS alt_text TEXT;

-- Optional: Add a comment explaining the column
COMMENT ON COLUMN post_images.alt_text IS 'Alternative text description for accessibility and SEO';
