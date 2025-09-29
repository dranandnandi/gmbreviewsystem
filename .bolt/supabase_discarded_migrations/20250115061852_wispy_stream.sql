/*
  # Update clinic settings access policy

  1. Changes
    - Add public access policy for clinic code verification
    - Keep existing authenticated access policy
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Allow authenticated read access to clinic_settings" ON clinic_settings;

-- Add public access policy for clinic code verification
CREATE POLICY "Allow public access for clinic code verification"
  ON clinic_settings
  FOR SELECT
  TO PUBLIC
  USING (true);

-- Re-add authenticated access policy for full clinic data
CREATE POLICY "Allow authenticated access to clinic data"
  ON clinic_settings
  FOR ALL
  TO authenticated
  USING (
    id IN (
      SELECT clinic_id 
      FROM users 
      WHERE auth_id = auth.uid()
    )
  );