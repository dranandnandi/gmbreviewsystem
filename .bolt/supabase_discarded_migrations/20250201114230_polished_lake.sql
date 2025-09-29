/*
  # Update Authentication System

  1. Changes
    - Add auth_id to users table
    - Update RLS policies
    - Add function to handle new user registration
    - Add trigger for auth user creation

  2. Security
    - Enable RLS
    - Add policies for user access
    - Ensure proper auth_id linking
*/

-- Add auth_id column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'auth_id'
  ) THEN
    ALTER TABLE users ADD COLUMN auth_id uuid REFERENCES auth.users(id);
  END IF;
END $$;

-- Function to handle new user registration
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

-- Update RLS policies
DROP POLICY IF EXISTS "Users can view users in their clinic" ON users;
DROP POLICY IF EXISTS "Users can update users in their clinic" ON users;

CREATE POLICY "Users can view users in their clinic"
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

CREATE POLICY "Users can update users in their clinic"
  ON users
  FOR UPDATE
  TO authenticated
  USING (
    clinic_id IN (
      SELECT clinic_id 
      FROM users 
      WHERE auth_id = auth.uid()
    )
  )
  WITH CHECK (
    clinic_id IN (
      SELECT clinic_id 
      FROM users 
      WHERE auth_id = auth.uid()
    )
  );