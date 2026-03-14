-- Migration 009: Add author profiles and co-authors support
-- This enables public author profiles with bio, location, favorites, and multi-author posts

-- ============================================
-- STEP 1: Add author profile fields to profiles table
-- ============================================

-- Bio field (1000 character limit)
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS bio TEXT CHECK (LENGTH(bio) <= 1000);

-- Location field (100 character limit)
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS location TEXT CHECK (LENGTH(location) <= 100);

-- Favorite adventure category (should match CATEGORIES constant)
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS favorite_category TEXT;

-- Favorite destination (100 character limit)
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS favorite_destination TEXT CHECK (LENGTH(favorite_destination) <= 100);

-- Profile visibility toggle (public by default)
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS is_profile_public BOOLEAN DEFAULT true;

-- Add comments for documentation
COMMENT ON COLUMN profiles.bio IS 'Author bio text, max 1000 characters';
COMMENT ON COLUMN profiles.location IS 'Author location, max 100 characters';
COMMENT ON COLUMN profiles.favorite_category IS 'Author favorite adventure category from CATEGORIES';
COMMENT ON COLUMN profiles.favorite_destination IS 'Author favorite travel destination, max 100 characters';
COMMENT ON COLUMN profiles.is_profile_public IS 'Whether the author profile is publicly visible';

-- ============================================
-- STEP 2: Make username required (NOT NULL)
-- ============================================

-- First, update any existing NULL usernames with a generated value
UPDATE profiles 
SET username = 'user-' || SUBSTRING(id::text, 1, 8) 
WHERE username IS NULL;

-- Now make username NOT NULL
ALTER TABLE profiles 
ALTER COLUMN username SET NOT NULL;

-- Create unique index on lowercase username for case-insensitive lookups
-- This also prevents duplicate usernames with different casing
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_username_lower 
ON profiles(LOWER(username));

-- ============================================
-- STEP 3: Create co-authors junction table
-- ============================================

CREATE TABLE IF NOT EXISTS post_co_authors (
  post_id INTEGER REFERENCES posts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (post_id, user_id)
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_post_co_authors_post_id ON post_co_authors(post_id);
CREATE INDEX IF NOT EXISTS idx_post_co_authors_user_id ON post_co_authors(user_id);

-- Index on posts.author_id for faster author lookups
CREATE INDEX IF NOT EXISTS idx_posts_author_id ON posts(author_id);

-- Comments for documentation
COMMENT ON TABLE post_co_authors IS 'Junction table linking posts to co-authors (in addition to primary author_id)';
COMMENT ON COLUMN post_co_authors.post_id IS 'Reference to the post';
COMMENT ON COLUMN post_co_authors.user_id IS 'Reference to the co-author user';

-- ============================================
-- STEP 4: Row Level Security for post_co_authors
-- ============================================

-- Enable RLS
ALTER TABLE post_co_authors ENABLE ROW LEVEL SECURITY;

-- Anyone can read co-authors (public info)
CREATE POLICY "Co-authors are publicly readable"
ON post_co_authors FOR SELECT
USING (true);

-- Only admins can manage co-authors
CREATE POLICY "Admins can insert co-authors"
ON post_co_authors FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'admin'
  )
);

CREATE POLICY "Admins can update co-authors"
ON post_co_authors FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'admin'
  )
);

CREATE POLICY "Admins can delete co-authors"
ON post_co_authors FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'admin'
  )
);

-- ============================================
-- VERIFICATION QUERIES (run these to confirm success)
-- ============================================

-- Check new columns exist on profiles:
-- SELECT column_name, data_type, is_nullable 
-- FROM information_schema.columns 
-- WHERE table_name = 'profiles' 
-- AND column_name IN ('bio', 'location', 'favorite_category', 'favorite_destination', 'is_profile_public');

-- Check post_co_authors table exists:
-- SELECT * FROM information_schema.tables WHERE table_name = 'post_co_authors';

-- Check indexes exist:
-- SELECT indexname FROM pg_indexes WHERE tablename IN ('profiles', 'post_co_authors', 'posts');

-- Check all usernames are NOT NULL:
-- SELECT COUNT(*) FROM profiles WHERE username IS NULL; -- Should return 0
