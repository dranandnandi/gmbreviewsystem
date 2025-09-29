/*
  # Create test users and profiles
  
  Creates initial test users with proper authentication and profiles
*/

DO $$ 
BEGIN
  -- Create users with proper authentication
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'admin1@clinic.com') THEN
    INSERT INTO auth.users (
      email,
      encrypted_password,
      email_confirmed_at,
      raw_user_meta_data,
      created_at,
      updated_at,
      is_sso_user
    ) VALUES (
      'admin1@clinic.com',
      crypt('Admin123!', gen_salt('bf')),
      now(),
      '{"name": "Admin One"}',
      now(),
      now(),
      false
    );
  END IF;

  -- Create profile for admin1 if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles p
    JOIN auth.users u ON u.id = p.id
    WHERE u.email = 'admin1@clinic.com'
  ) THEN
    INSERT INTO public.profiles (id, name, role)
    SELECT id, 'Admin One', 'admin'
    FROM auth.users
    WHERE email = 'admin1@clinic.com';
  END IF;
END $$;