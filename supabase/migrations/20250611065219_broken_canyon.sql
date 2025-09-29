/*
  # Add enabled_features column to users table

  1. Changes
    - Add enabled_features column to users table as jsonb array
    - Set default value to empty array
    - Update existing users to have all features enabled by default

  2. Security
    - No changes to RLS policies needed as this is just adding a column to existing table
*/

-- Add enabled_features column to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS enabled_features jsonb DEFAULT '[]'::jsonb;

-- Update existing users to have all features enabled by default
UPDATE users 
SET enabled_features = '["dashboard", "appointments", "reviews", "sequences", "creatives"]'::jsonb
WHERE enabled_features IS NULL OR enabled_features = '[]'::jsonb;

-- Add comment for documentation
COMMENT ON COLUMN users.enabled_features IS 'Array of enabled feature names for the user';