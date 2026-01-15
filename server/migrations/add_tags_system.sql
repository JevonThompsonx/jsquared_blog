-- Migration: Add tags system for posts
-- Allows multiple tags per post with predefined + custom tags

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
