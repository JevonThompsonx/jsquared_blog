-- Migration 010: Fix profiles RLS to allow updating author profile fields
-- This ensures users can update their own bio, location, favorites, and privacy settings

-- ============================================
-- STEP 1: Drop existing update policy and recreate
-- ============================================

-- Drop existing policy
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;

-- Recreate with explicit column coverage
-- The policy allows ANY column update as long as the user is updating their own row
CREATE POLICY "Users can update their own profile"
ON profiles FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- ============================================
-- STEP 2: Also ensure public read access for public profiles
-- ============================================

-- Drop existing public read policy if it exists
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;

-- Allow anyone to read public profile info (for author pages)
-- This only returns public profiles or the user's own profile
CREATE POLICY "Public profiles are viewable by everyone"
ON profiles FOR SELECT
USING (
  is_profile_public = true 
  OR auth.uid() = id
);

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Check policies exist:
-- SELECT policyname, cmd, qual FROM pg_policies WHERE tablename = 'profiles';

-- Test update (replace UUID with actual user id):
-- UPDATE profiles SET bio = 'test bio' WHERE id = 'your-user-id';
