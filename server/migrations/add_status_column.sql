-- Migration: Add status column to posts table
-- Description: Adds a status field to support draft/published workflow
-- Date: 2025-12-28

-- Add status column with default value 'published' to maintain existing posts
ALTER TABLE posts
ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'published'
CHECK (status IN ('draft', 'published'));

-- Create an index on status for better query performance
CREATE INDEX IF NOT EXISTS idx_posts_status ON posts(status);

-- Create a composite index for common queries (status + created_at)
CREATE INDEX IF NOT EXISTS idx_posts_status_created_at ON posts(status, created_at DESC);

-- Update existing posts to 'published' status (just to be explicit)
UPDATE posts SET status = 'published' WHERE status IS NULL OR status = '';
