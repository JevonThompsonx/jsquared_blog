# Database Migration Instructions

## Overview
There are TWO migrations that need to be run:
1. **Draft Posts Migration** - Adds status column (draft/published)
2. **Comments System Migration** - Creates comments tables

⚠️ **IMPORTANT**: Run Migration 1 first, then Migration 2

## How to Run the Migrations

### Step 1: Access Supabase Dashboard
1. Go to https://supabase.com
2. Sign in to your account
3. Select your **jsquared_blog** project

### Step 2: Open SQL Editor
1. Click **SQL Editor** in the left sidebar
2. Click **New Query** button

### Step 3: Run Migration 1 (Draft Posts)
1. Copy **Migration 1 SQL** below
2. Paste it into the query editor
3. Click **Run** (or press Ctrl+Enter)
4. Wait for "Success" message

### Step 4: Run Migration 2 (Comments)
1. Click **New Query** again to create a fresh query
2. Copy **Migration 2 SQL** below
3. Paste it into the query editor
4. Click **Run** (or press Ctrl+Enter)
5. Wait for "Success" message

---

## Migration 1: Add Draft/Published Status

```sql
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
```

---

## Migration 2: Comments System

```sql
-- Migration: Create comments and comment_likes tables
-- Description: Adds comments system with likes (no like count display)
-- Date: 2025-12-28

-- Create comments table
CREATE TABLE IF NOT EXISTS comments (
  id BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  content TEXT NOT NULL,
  post_id BIGINT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT content_not_empty CHECK (LENGTH(TRIM(content)) > 0)
);

-- Create comment_likes table (tracks which users liked which comments)
CREATE TABLE IF NOT EXISTS comment_likes (
  id BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  comment_id BIGINT NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  UNIQUE(comment_id, user_id) -- A user can only like a comment once
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_comments_post_id ON comments(post_id);
CREATE INDEX IF NOT EXISTS idx_comments_user_id ON comments(user_id);
CREATE INDEX IF NOT EXISTS idx_comments_created_at ON comments(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_comment_likes_comment_id ON comment_likes(comment_id);
CREATE INDEX IF NOT EXISTS idx_comment_likes_user_id ON comment_likes(user_id);

-- Add updated_at trigger for comments table
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_comments_updated_at
  BEFORE UPDATE ON comments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE comment_likes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for comments
-- Anyone can read comments
CREATE POLICY "Comments are viewable by everyone"
  ON comments FOR SELECT
  USING (true);

-- Authenticated users can create comments
CREATE POLICY "Authenticated users can create comments"
  ON comments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own comments
CREATE POLICY "Users can update their own comments"
  ON comments FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own comments (or admins can delete any)
CREATE POLICY "Users can delete their own comments"
  ON comments FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for comment_likes
-- Anyone can read comment likes
CREATE POLICY "Comment likes are viewable by everyone"
  ON comment_likes FOR SELECT
  USING (true);

-- Authenticated users can like comments
CREATE POLICY "Authenticated users can like comments"
  ON comment_likes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can unlike (delete) their own likes
CREATE POLICY "Users can unlike comments"
  ON comment_likes FOR DELETE
  USING (auth.uid() = user_id);
```

---

## What These Migrations Create

### Migration 1: Draft/Published Status
- **posts.status** column - Allows saving posts as drafts or published
- Indexes for better query performance
- All existing posts are set to 'published'

### Migration 2: Comments System
- **comments** table - Stores all blog post comments
- **comment_likes** table - Tracks which users liked which comments (one like per user per comment)
- Row Level Security (RLS) policies for both tables
- Indexes on frequently queried columns

---

## After Running Both Migrations

Once both migrations are complete, all features will work:

✓ **Draft Posts**
  - Save posts as drafts (only visible to admins)
  - Publish posts (visible to everyone)
  - Toggle between draft/published status

✓ **Comments System**
  - Users can post comments on blog posts (when logged in)
  - Users can like comments with the heart icon
  - Comments can be sorted by likes, newest, or oldest
  - Users can delete their own comments
  - Comments section appears at the bottom of each blog post

## Testing

1. Navigate to any blog post on your site
2. Scroll to the bottom to see the comments section
3. Log in to post a comment
4. Try liking comments and sorting options
