/*
  # Add Super Admin User
  
  1. Changes
    - Add super admin user with email ajpriyadarshi@gmail.com
    - Create profile with admin role
*/

-- First, create the user if not exists
DO $$ 
BEGIN
  -- Create super admin user
  IF NOT EXISTS (
    SELECT 1 FROM auth.users 
    WHERE email = 'ajpriyadarshi@gmail.com'
  ) THEN
    INSERT INTO auth.users (
      id,  -- Required field
      instance_id,  -- Required field
      email,
      encrypted_password,
      email_confirmed_at,
      raw_user_meta_data,
      created_at,
      updated_at,
      is_sso_user,
      role
    ) VALUES (
      gen_random_uuid(),  -- Generate UUID for id
      '00000000-0000-0000-0000-000000000000',  -- Default instance_id
      'ajpriyadarshi@gmail.com',
      crypt('Anand@2025', gen_salt('bf')),
      now(),
      '{"name": "Super Admin"}',
      now(),
      now(),
      false,
      'authenticated'
    );
  END IF;

  -- Create profile for super admin
  INSERT INTO public.profiles (id, name, role)
  SELECT 
    id,
    'Super Admin',
    'admin'
  FROM auth.users
  WHERE email = 'ajpriyadarshi@gmail.com'
  AND NOT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.users.id
  );
END $$;