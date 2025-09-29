/*
  # Fix auth users and email format

  1. Changes
    - Update auth.users email format to use clinic code
    - Ensure consistency between auth.users and users table
    - Add function to format email consistently
*/

-- Function to generate consistent email format
CREATE OR REPLACE FUNCTION format_clinic_email(username text, clinic_code text)
RETURNS text AS $$
BEGIN
  RETURN username || '@' || lower(clinic_code) || '.clinic';
END;
$$ LANGUAGE plpgsql;

-- Update existing auth users
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN 
    SELECT u.username, u.password_hash, cs.clinic_code
    FROM users u
    JOIN clinic_settings cs ON u.clinic_id = cs.id
    WHERE u.auth_id IS NULL
  LOOP
    -- Create auth user if doesn't exist
    INSERT INTO auth.users (
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      aud,
      role
    )
    VALUES (
      format_clinic_email(r.username, r.clinic_code),
      r.password_hash,
      now(),
      '{"provider":"email","providers":["email"]}',
      jsonb_build_object('username', r.username),
      'authenticated',
      'authenticated'
    )
    ON CONFLICT (email) DO NOTHING;
    
    -- Link auth user to users table
    UPDATE users u
    SET auth_id = (
      SELECT id FROM auth.users 
      WHERE email = format_clinic_email(r.username, r.clinic_code)
    )
    WHERE username = r.username;
  END LOOP;
END $$;