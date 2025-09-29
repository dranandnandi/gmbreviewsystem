-- Drop existing policies
DROP POLICY IF EXISTS "Anyone can view doctors" ON doctors;
DROP POLICY IF EXISTS "Authenticated users can insert doctors" ON doctors;
DROP POLICY IF EXISTS "Only admins can update or delete doctors" ON doctors;
DROP POLICY IF EXISTS "Only admins can delete doctors" ON doctors;

-- Create simplified policies
CREATE POLICY "Enable read access for authenticated users"
  ON doctors FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Enable insert access for authenticated users"
  ON doctors FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Enable update access for authenticated users"
  ON doctors FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Enable delete access for authenticated users"
  ON doctors FOR DELETE
  TO authenticated
  USING (true);