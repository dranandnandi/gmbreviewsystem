-- Create super admin user
DO $$ 
DECLARE
  new_user_id uuid := gen_random_uuid();
BEGIN
  -- Create the user
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
    aud,
    role,
    confirmation_token
  ) VALUES (
    new_user_id,
    '00000000-0000-0000-0000-000000000000',
    'super@admin.com',
    crypt('SuperAdmin123!', gen_salt('bf')),
    now(),
    jsonb_build_object(
      'name', 'Super Admin',
      'role', 'super_admin'
    ),
    now(),
    now(),
    false,
    'authenticated',
    'authenticated',
    encode(gen_random_bytes(32), 'hex')
  );

  -- Create the profile
  INSERT INTO public.profiles (
    id,
    name,
    role
  ) VALUES (
    new_user_id,
    'Super Admin',
    'super_admin'
  );

  -- Confirm email and set up authentication
  UPDATE auth.users
  SET 
    email_confirmed_at = now(),
    is_sso_user = false,
    confirmed_at = now()
  WHERE id = new_user_id;
END $$;