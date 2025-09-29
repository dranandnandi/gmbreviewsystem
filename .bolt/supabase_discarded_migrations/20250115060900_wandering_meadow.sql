/*
  # Create demo clinic and user data

  1. Changes
    - Create demo clinic with DEMO123 code
    - Create demo admin user
    - Ensure data exists for testing
*/

-- Create demo clinic if it doesn't exist
INSERT INTO clinic_settings (
  clinic_code,
  name,
  address,
  gmb_link,
  primary_color,
  secondary_color
)
VALUES (
  'DEMO123',
  'Demo Clinic',
  '123 Healthcare Street, Medical District',
  'https://g.page/demo-clinic',
  '#4F46E5',
  '#E5E7EB'
)
ON CONFLICT (clinic_code) DO NOTHING;

-- Create demo admin user if it doesn't exist
WITH clinic_data AS (
  SELECT id FROM clinic_settings WHERE clinic_code = 'DEMO123'
)
INSERT INTO users (
  clinic_id,
  username,
  password_hash,
  name,
  role
)
SELECT 
  clinic_data.id,
  'admin',
  crypt('admin123', gen_salt('bf')),
  'Demo Admin',
  'admin'
FROM clinic_data
ON CONFLICT (username) DO NOTHING;