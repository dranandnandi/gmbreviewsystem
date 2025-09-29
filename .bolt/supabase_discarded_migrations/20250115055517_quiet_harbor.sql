/*
  # Set up authentication and update policies

  1. Changes
    - Enable auth schema
    - Update RLS policies to use auth.uid()
    - Add email authentication for users
  
  2. Security
    - Proper authentication flow using Supabase Auth
    - Updated RLS policies to work with auth.uid()
*/

-- Update users table to include auth_id
ALTER TABLE users ADD COLUMN IF NOT EXISTS auth_id uuid REFERENCES auth.users(id);

-- Update RLS policies to use auth.uid()
DROP POLICY IF EXISTS "Allow public read access to clinic_settings" ON clinic_settings;
DROP POLICY IF EXISTS "Allow public read access to users" ON users;
DROP POLICY IF EXISTS "Allow public read access to doctors" ON doctors;

CREATE POLICY "Allow authenticated read access to clinic_settings"
  ON clinic_settings
  FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT clinic_id 
      FROM users 
      WHERE auth_id = auth.uid()
    )
  );

CREATE POLICY "Allow authenticated read access to users"
  ON users
  FOR SELECT
  TO authenticated
  USING (
    clinic_id IN (
      SELECT clinic_id 
      FROM users 
      WHERE auth_id = auth.uid()
    )
  );

CREATE POLICY "Allow authenticated read access to doctors"
  ON doctors
  FOR SELECT
  TO authenticated
  USING (
    clinic_id IN (
      SELECT clinic_id 
      FROM users 
      WHERE auth_id = auth.uid()
    )
  );

-- Function to handle user registration
CREATE OR REPLACE FUNCTION handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  UPDATE users
  SET auth_id = NEW.id
  WHERE username = NEW.email;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user registration
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();