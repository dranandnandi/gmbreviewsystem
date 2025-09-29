-- Add super_admin to role check
ALTER TABLE profiles 
DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE profiles 
ADD CONSTRAINT profiles_role_check 
CHECK (role IN ('super_admin', 'admin', 'receptionist'));

-- Create super admin user with all required fields
DO $$ 
DECLARE
  super_admin_id uuid;
BEGIN
  -- Generate UUID for super admin
  super_admin_id := gen_random_uuid();
  
  -- Create super admin user
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
    role
  ) VALUES (
    super_admin_id,
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
    'authenticated'
  );

  -- Create super admin profile
  INSERT INTO profiles (
    id,
    name,
    role
  ) VALUES (
    super_admin_id,
    'Super Admin',
    'super_admin'
  );
END $$;

-- Update RLS policies for super admin access
DO $$ 
BEGIN
  -- Allow super admin to view all clinics
  DROP POLICY IF EXISTS "Super admin can view all clinics" ON clinic_settings;
  CREATE POLICY "Super admin can view all clinics"
    ON clinic_settings FOR SELECT
    TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid()
        AND role = 'super_admin'
      )
    );

  -- Allow super admin to manage all clinics
  DROP POLICY IF EXISTS "Super admin can manage all clinics" ON clinic_settings;
  CREATE POLICY "Super admin can manage all clinics"
    ON clinic_settings FOR ALL
    TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid()
        AND role = 'super_admin'
      )
    );

  -- Allow super admin to view all profiles
  DROP POLICY IF EXISTS "Super admin can view all profiles" ON profiles;
  CREATE POLICY "Super admin can view all profiles"
    ON profiles FOR SELECT
    TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid()
        AND role = 'super_admin'
      )
    );

  -- Allow super admin to manage all profiles
  DROP POLICY IF EXISTS "Super admin can manage all profiles" ON profiles;
  CREATE POLICY "Super admin can manage all profiles"
    ON profiles FOR ALL
    TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid()
        AND role = 'super_admin'
      )
    );
END $$;