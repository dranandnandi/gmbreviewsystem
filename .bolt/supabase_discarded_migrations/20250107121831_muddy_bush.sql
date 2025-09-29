-- Drop existing policies
DROP POLICY IF EXISTS "Users view own profile" ON profiles;
DROP POLICY IF EXISTS "Super admin manage all" ON profiles;

-- Create new policies for profiles table
CREATE POLICY "Enable read access for own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (id = auth.uid());

CREATE POLICY "Enable read access for clinic members"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    clinic_id IN (
      SELECT p.clinic_id 
      FROM profiles p 
      WHERE p.id = auth.uid()
      AND p.clinic_id IS NOT NULL
    )
  );

CREATE POLICY "Super admin access"
  ON profiles FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 
      FROM profiles p 
      WHERE p.id = auth.uid() 
      AND p.role = 'super_admin'
    )
  );

CREATE POLICY "Admin manage clinic profiles"
  ON profiles FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 
      FROM profiles p 
      WHERE p.id = auth.uid() 
      AND p.role = 'admin'
      AND p.clinic_id = profiles.clinic_id
    )
  );