/*
  # Add test users and profiles

  1. Test Users
    - Admin users (2)
    - Receptionist users (3)
  
  2. Security
    - Each user has a corresponding profile
    - Admins and receptionists have appropriate roles
*/

-- Create test users and their profiles
DO $$ 
BEGIN
  -- Admin 1
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'admin1@clinic.com') THEN
    INSERT INTO auth.users (id, email, raw_user_meta_data, email_confirmed_at, created_at, updated_at)
    VALUES (
      gen_random_uuid(),
      'admin1@clinic.com',
      '{"name": "Admin One"}',
      now(),
      now(),
      now()
    );
    
    INSERT INTO public.profiles (id, name, role)
    SELECT id, 'Admin One', 'admin'
    FROM auth.users
    WHERE email = 'admin1@clinic.com';
  END IF;

  -- Admin 2
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'admin2@clinic.com') THEN
    INSERT INTO auth.users (id, email, raw_user_meta_data, email_confirmed_at, created_at, updated_at)
    VALUES (
      gen_random_uuid(),
      'admin2@clinic.com',
      '{"name": "Admin Two"}',
      now(),
      now(),
      now()
    );
    
    INSERT INTO public.profiles (id, name, role)
    SELECT id, 'Admin Two', 'admin'
    FROM auth.users
    WHERE email = 'admin2@clinic.com';
  END IF;

  -- Receptionist 1
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'receptionist1@clinic.com') THEN
    INSERT INTO auth.users (id, email, raw_user_meta_data, email_confirmed_at, created_at, updated_at)
    VALUES (
      gen_random_uuid(),
      'receptionist1@clinic.com',
      '{"name": "Receptionist One"}',
      now(),
      now(),
      now()
    );
    
    INSERT INTO public.profiles (id, name, role)
    SELECT id, 'Receptionist One', 'receptionist'
    FROM auth.users
    WHERE email = 'receptionist1@clinic.com';
  END IF;

  -- Receptionist 2
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'receptionist2@clinic.com') THEN
    INSERT INTO auth.users (id, email, raw_user_meta_data, email_confirmed_at, created_at, updated_at)
    VALUES (
      gen_random_uuid(),
      'receptionist2@clinic.com',
      '{"name": "Receptionist Two"}',
      now(),
      now(),
      now()
    );
    
    INSERT INTO public.profiles (id, name, role)
    SELECT id, 'Receptionist Two', 'receptionist'
    FROM auth.users
    WHERE email = 'receptionist2@clinic.com';
  END IF;

  -- Receptionist 3
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'receptionist3@clinic.com') THEN
    INSERT INTO auth.users (id, email, raw_user_meta_data, email_confirmed_at, created_at, updated_at)
    VALUES (
      gen_random_uuid(),
      'receptionist3@clinic.com',
      '{"name": "Receptionist Three"}',
      now(),
      now(),
      now()
    );
    
    INSERT INTO public.profiles (id, name, role)
    SELECT id, 'Receptionist Three', 'receptionist'
    FROM auth.users
    WHERE email = 'receptionist3@clinic.com';
  END IF;
END $$;