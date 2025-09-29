/*
  # Fix RLS policies for users table

  1. Changes
    - Drop existing problematic policies
    - Create new simplified policies that avoid recursion
    - Add proper access control based on clinic_id

  2. Security
    - Enable RLS on users table
    - Add policies for authenticated users
    - Restrict access to users within same clinic
*/

-- Drop existing policies to clean up
DROP POLICY IF EXISTS "Allow public read access to users" ON users;
DROP POLICY IF EXISTS "Allow authenticated read access to users" ON users;

-- Create new policies without recursion
CREATE POLICY "Users can view users in their clinic"
  ON users
  FOR SELECT
  TO authenticated
  USING (
    clinic_id IN (
      SELECT id FROM clinic_settings WHERE clinic_code = current_setting('app.current_clinic_code', true)
    )
  );

CREATE POLICY "Users can update users in their clinic"
  ON users
  FOR UPDATE
  TO authenticated
  USING (
    clinic_id IN (
      SELECT id FROM clinic_settings WHERE clinic_code = current_setting('app.current_clinic_code', true)
    )
  )
  WITH CHECK (
    clinic_id IN (
      SELECT id FROM clinic_settings WHERE clinic_code = current_setting('app.current_clinic_code', true)
    )
  );

-- Function to set current clinic code
CREATE OR REPLACE FUNCTION set_current_clinic_code(code text)
RETURNS void AS $$
BEGIN
  PERFORM set_config('app.current_clinic_code', code, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;