/*
  # Create demo user in auth schema

  1. Changes
    - Create demo user in auth.users
    - Link demo user to existing users table
*/

-- Insert demo user into auth.users
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  confirmation_token,
  email_change_token_new,
  recovery_token
)
VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'admin',
  crypt('admin123', gen_salt('bf')),
  now(),
  now(),
  now(),
  '',
  '',
  ''
) ON CONFLICT (email) DO NOTHING;

-- Link auth user to existing user
UPDATE users
SET auth_id = (SELECT id FROM auth.users WHERE email = 'admin')
WHERE username = 'admin';