-- Migration 011: Remove bio character limit
-- Allow users to write bios of unlimited length

-- Drop the existing constraint on bio length
ALTER TABLE profiles
DROP CONSTRAINT IF EXISTS profiles_bio_check;

-- Update the comment to reflect unlimited length
COMMENT ON COLUMN profiles.bio IS 'Author bio text, unlimited length';

-- Verification: Check that the constraint is removed
-- SELECT constraint_name FROM information_schema.check_constraints 
-- WHERE constraint_name LIKE '%bio%';
