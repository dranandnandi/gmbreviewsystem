/*
  # Fix user authentication setup
  
  1. Changes
    - Add unique constraint for username
    - Create demo clinic
    - Create demo user with proper auth integration
*/

-- First ensure we have the unique constraint on username
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_username_key;
ALTER TABLE users ADD CONSTRAINT users_username_key UNIQUE (username);

-- Ensure the demo clinic exists
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

-- Get the clinic ID for the demo clinic
DO $$
DECLARE
  v_clinic_id uuid;
BEGIN
  -- Get the clinic ID
  SELECT id INTO v_clinic_id
  FROM clinic_settings
  WHERE clinic_code = 'DEMO123';

  -- Create the user in the users table
  INSERT INTO users (
    clinic_id,
    username,
    password_hash,
    name,
    role
  )
  VALUES (
    v_clinic_id,
    'admin',
    crypt('admin123', gen_salt('bf')),
    'Demo Admin',
    'admin'
  )
  ON CONFLICT ON CONSTRAINT users_username_key
  DO UPDATE SET 
    password_hash = EXCLUDED.password_hash;

END $$;