-- Migration 008: Add date_format_preference to profiles table
-- This allows users to choose between relative dates ("5 days ago") and absolute dates ("Jan 10, 2026")

-- Add date_format_preference column to profiles table
ALTER TABLE profiles
ADD COLUMN date_format_preference TEXT DEFAULT 'relative' CHECK (date_format_preference IN ('relative', 'absolute'));

-- Comment for documentation
COMMENT ON COLUMN profiles.date_format_preference IS 'User preference for date display format: "relative" (e.g., "5 days ago") or "absolute" (e.g., "Jan 10, 2026")';
