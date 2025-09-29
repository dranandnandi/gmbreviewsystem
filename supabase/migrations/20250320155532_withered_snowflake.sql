/*
  # Add new creative content for March 2025
  
  1. Changes
    - Add new creative entry for specific user
    - Use proper year and month_number columns
    
  2. Security
    - No changes to RLS policies needed
*/

-- First, delete any existing creatives for the user with the same content
DELETE FROM creatives
WHERE user_id IN (
  SELECT id FROM users WHERE contact_email = 'swastikcdckarwar@gmail.com'
)
AND content LIKE '%drive.google.com%';

-- Insert the new creative
INSERT INTO creatives (
  user_id,
  category_id,
  title,
  description,
  content_type,
  content,
  year,
  month_number,
  created_at
)
SELECT 
  u.id as user_id,
  c.id as category_id,
  'Health Awareness Drive 2025',
  'Educational presentation about health awareness',
  'iframe',
  '<iframe src="https://drive.google.com/file/d/18XkZY5LxatR7CUnR4_HdVmE1TpktR3a6/preview" style="width: 700px; max-width: 100%; height: 450px" allow="fullscreen" title="Health Awareness Drive 2025"></iframe>',
  2025,
  3,
  now()
FROM users u
CROSS JOIN creative_categories c
WHERE u.contact_email = 'swastikcdckarwar@gmail.com'
  AND c.name = 'Presentations';