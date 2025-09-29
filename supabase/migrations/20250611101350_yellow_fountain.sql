/*
  # Update users to include reports feature

  1. Changes
    - Update existing users to have reports feature enabled by default
    - Only update users who have null or empty enabled_features

  2. Security
    - No changes to RLS policies needed
*/

-- Update existing users to have all features enabled by default
UPDATE users 
SET enabled_features = '["dashboard", "appointments", "reviews", "sequences", "creatives", "reports"]'::jsonb
WHERE enabled_features IS NULL OR enabled_features = '[]'::jsonb;