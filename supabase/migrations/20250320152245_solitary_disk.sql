/*
  # Fix creative visibility for specific user

  1. Changes
    - Delete existing creative for the user
    - Insert new creative with correct user association
    - Add index for better query performance

  2. Notes
    - Ensures creative is properly linked to user's account
    - Uses email to identify the correct user
*/

-- First, delete any existing creatives for the user
DELETE FROM creatives
WHERE user_id IN (
  SELECT id FROM users WHERE contact_email = 'swastikcdckarwar@gmail.com'
);

-- Insert the creative with proper user association
INSERT INTO creatives (
  user_id,
  category_id,
  title,
  description,
  content_type,
  content,
  month
)
SELECT 
  u.id as user_id,
  c.id as category_id,
  'Precision for a Healthier 2025',
  'Health awareness presentation',
  'iframe',
  '<iframe src="https://gamma.app/embed/bimp1ueuw5ahjsr" style="width: 700px; max-width: 100%; height: 450px" allow="fullscreen" title="Precision for a Healthier 2025"></iframe>',
  '2025-03-01'::date
FROM users u
CROSS JOIN creative_categories c
WHERE u.contact_email = 'swastikcdckarwar@gmail.com'
  AND c.name = 'Presentations';

-- Add index for better performance on user queries
CREATE INDEX IF NOT EXISTS creatives_user_id_month_idx ON creatives(user_id, month);