-- Drop existing policies on doctors table
DROP POLICY IF EXISTS "Enable read access for users in same clinic" ON doctors;
DROP POLICY IF EXISTS "Enable insert access for users in same clinic" ON doctors;
DROP POLICY IF EXISTS "Enable update access for users in same clinic" ON doctors;
DROP POLICY IF EXISTS "Enable delete access for users in same clinic" ON doctors;

-- Create new open policy for doctors table
CREATE POLICY "Allow all access to doctors"
  ON doctors FOR ALL
  USING (true)
  WITH CHECK (true);

-- Ensure RLS is still enabled
ALTER TABLE doctors ENABLE ROW LEVEL SECURITY;