-- Create super admin user with all required fields
DO $$ 
DECLARE
  new_user_id uuid;
BEGIN
  -- Create super admin user if not exists
  IF NOT EXISTS (
    SELECT 1 FROM auth.users 
    WHERE email = 'ajpriyadarshi@gmail.com'
  ) THEN
    -- Generate a new UUID for the user
    new_user_id := gen_random_uuid();
    
    -- Insert the user with all required fields
    INSERT INTO auth.users (
      id,
      instance_id,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_user_meta_data,
      created_at,
      updated_at,
      is_sso_user,
      role,
      aud,
      confirmation_token
    ) VALUES (
      new_user_id,
      '00000000-0000-0000-0000-000000000000',
      'ajpriyadarshi@gmail.com',
      crypt('Anand@2025', gen_salt('bf')),
      now(),
      jsonb_build_object(
        'name', 'Super Admin',
        'role', 'admin'
      ),
      now(),
      now(),
      false,
      'authenticated',
      'authenticated',
      encode(gen_random_bytes(32), 'hex')
    );

    -- Create profile for the super admin
    INSERT INTO public.profiles (id, name, role)
    VALUES (new_user_id, 'Super Admin', 'admin');
  END IF;
END $$;