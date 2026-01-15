-- Migration: Add scheduling columns to posts table
-- Allows scheduling posts for future publication

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
