/*
  # Update doctors table RLS policies

  1. Changes
    - Modify RLS policies for doctors table to allow authenticated users to insert records
    - Keep existing policies for viewing and admin modifications

  2. Security
    - All authenticated users can insert new doctors
    - Only admins can update/delete doctors
    - Anyone authenticated can view doctors
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Anyone can view doctors" ON doctors;
DROP POLICY IF EXISTS "Only admins can modify doctors" ON doctors;

-- Create new policies
CREATE POLICY "Anyone can view doctors"
  ON doctors FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert doctors"
  ON doctors FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Only admins can update or delete doctors"
  ON doctors FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Only admins can delete doctors"
  ON doctors FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );