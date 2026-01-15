-- ============================================================
-- Combined Migrations for J²Adventures Blog
-- Run this SQL in Supabase Dashboard > SQL Editor
-- ============================================================

-- ============================================================
-- 1. Add alt_text column to post_images table
-- ============================================================
ALTER TABLE post_images ADD COLUMN IF NOT EXISTS alt_text TEXT;

COMMENT ON COLUMN post_images.alt_text IS 'Alternative text description for accessibility and SEO';

-- ============================================================
-- 2. Add scheduling columns to posts table
-- ============================================================

-- Add scheduled_for column (when the post should be published)
ALTER TABLE posts ADD COLUMN IF NOT EXISTS scheduled_for TIMESTAMPTZ;

-- Add published_at column (when the post was actually published)
ALTER TABLE posts ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ;

-- Update status check constraint to include 'scheduled'
ALTER TABLE posts DROP CONSTRAINT IF EXISTS posts_status_check;
ALTER TABLE posts ADD CONSTRAINT posts_status_check
  CHECK (status IN ('draft', 'published', 'scheduled'));

-- Index for efficiently finding scheduled posts that need publishing
CREATE INDEX IF NOT EXISTS idx_posts_scheduled_for
  ON posts(scheduled_for)
  WHERE status = 'scheduled';

-- Set published_at for existing published posts (use created_at as fallback)
UPDATE posts SET published_at = created_at WHERE status = 'published' AND published_at IS NULL;

-- ============================================================
-- 3. Add tags system
-- ============================================================

-- Tags table
CREATE TABLE IF NOT EXISTS tags (
  id SERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Junction table for post-tag relationship
CREATE TABLE IF NOT EXISTS post_tags (
  post_id INTEGER REFERENCES posts(id) ON DELETE CASCADE,
  tag_id INTEGER REFERENCES tags(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (post_id, tag_id)
);

-- Index for efficient tag lookups
CREATE INDEX IF NOT EXISTS idx_post_tags_post_id ON post_tags(post_id);
CREATE INDEX IF NOT EXISTS idx_post_tags_tag_id ON post_tags(tag_id);
CREATE INDEX IF NOT EXISTS idx_tags_slug ON tags(slug);

-- Seed predefined tags
INSERT INTO tags (name, slug) VALUES
  ('Adventure', 'adventure'),
  ('Family', 'family'),
  ('Solo', 'solo'),
  ('Budget', 'budget'),
  ('Luxury', 'luxury'),
  ('Weekend', 'weekend'),
  ('Long Trip', 'long-trip'),
  ('Local', 'local'),
  ('International', 'international'),
  ('Tips', 'tips')
ON CONFLICT (name) DO NOTHING;

-- ============================================================
-- Migration Complete!
-- ============================================================
-- Next steps:
-- 1. Verify tables and columns were created successfully
-- 2. Check that predefined tags were inserted
-- 3. Test the application with the new features
-- ============================================================
