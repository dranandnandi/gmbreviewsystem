-- Create initial admin user
DO $$ 
DECLARE
  new_user_id uuid;
BEGIN
  -- Create admin user
  INSERT INTO auth.users (
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
    '00000000-0000-0000-0000-000000000000',
    'admin@clinic.com',
    crypt('Admin123!', gen_salt('bf')),
    now(),
    jsonb_build_object(
      'name', 'Admin',
      'role', 'admin'
    ),
    now(),
    now(),
    false,
    'authenticated',
    'authenticated',
    encode(gen_random_bytes(32), 'hex')
  )
  RETURNING id INTO new_user_id;

  -- Create admin profile
  INSERT INTO public.profiles (
    id,
    name,
    role
  ) VALUES (
    new_user_id,
    'Admin',
    'admin'
  );

  -- Confirm email
  UPDATE auth.users
  SET 
    email_confirmed_at = now(),
    confirmed_at = now()
  WHERE id = new_user_id;
END $$;