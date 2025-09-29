/*
  # Fix Auth User Creation

  1. Changes
    - Create auth user safely without ON CONFLICT
    - Link auth user with existing users table
*/

-- Create the demo user in auth.users if it doesn't exist
DO $$
DECLARE
  v_user_id uuid;
BEGIN
  -- Check if auth user already exists
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = 'admin';

  -- If user doesn't exist, create it
  IF v_user_id IS NULL THEN
    v_user_id := gen_random_uuid();
    
    INSERT INTO auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      confirmation_token,
      recovery_token,
      email_change_token_new,
      email_change
    )
    VALUES (
      '00000000-0000-0000-0000-000000000000',
      v_user_id,
      'authenticated',
      'authenticated',
      'admin',
      crypt('admin123', gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}',
      '{"name":"Demo Admin"}',
      now(),
      now(),
      '',
      '',
      '',
      ''
    );
  END IF;

  -- Update the users table to link with auth user
  UPDATE users 
  SET auth_id = v_user_id
  WHERE username = 'admin';
END $$;