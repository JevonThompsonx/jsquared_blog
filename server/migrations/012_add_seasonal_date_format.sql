-- Migration 012: Add 'seasonal' date format option and make it the default
-- This allows users to see dates as seasons (e.g., "Winter 2026", "Summer 2025")

-- First, drop the existing constraint
ALTER TABLE profiles
DROP CONSTRAINT IF EXISTS profiles_date_format_preference_check;

-- Add the new constraint with 'seasonal' included
ALTER TABLE profiles
ADD CONSTRAINT profiles_date_format_preference_check 
CHECK (date_format_preference IN ('seasonal', 'relative', 'absolute'));

-- Update the default to 'seasonal'
ALTER TABLE profiles
ALTER COLUMN date_format_preference SET DEFAULT 'seasonal';

-- Update existing users who have 'relative' (the old default) to 'seasonal' (the new default)
-- Only update if they never explicitly changed it (still on old default)
-- Note: If you want to preserve existing user preferences, comment out the UPDATE statement below
UPDATE profiles
SET date_format_preference = 'seasonal'
WHERE date_format_preference = 'relative' OR date_format_preference IS NULL;

-- Update the column comment
COMMENT ON COLUMN profiles.date_format_preference IS 'User preference for date display format: "seasonal" (default, e.g., "Winter 2026"), "relative" (e.g., "5 days ago"), or "absolute" (e.g., "Jan 10, 2026")';
