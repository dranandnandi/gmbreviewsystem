/*
  # Set default features for new users

  1. Changes
    - Update the default value of enabled_features column to include all features
    - This ensures new users will have all features enabled by default

  2. Security
    - No changes to RLS policies needed
*/

-- Update the default value for enabled_features column
ALTER TABLE users 
ALTER COLUMN enabled_features 
SET DEFAULT '["dashboard", "appointments", "reviews", "sequences", "creatives", "reports"]'::jsonb;