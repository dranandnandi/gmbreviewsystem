/*
  # Add Username to Patient Profiles

  1. Changes
    - Add username field to patient_profiles table
    - Add unique constraint for username + clinic_id combination
    - Add foreign key reference to users table
  
  2. Security
    - Update RLS policies to include username checks
*/

-- Add username field to patient_profiles
ALTER TABLE patient_profiles 
ADD COLUMN username text NOT NULL REFERENCES users(username),
ADD CONSTRAINT patient_profiles_username_clinic_unique UNIQUE (username, clinic_id);

-- Update RLS policies to include username checks
DROP POLICY IF EXISTS "Users can view patient profiles for their clinic" ON patient_profiles;
DROP POLICY IF EXISTS "Users can insert patient profiles for their clinic" ON patient_profiles;
DROP POLICY IF EXISTS "Users can update patient profiles in their clinic" ON patient_profiles;

-- Recreate policies with username checks
CREATE POLICY "Users can view patient profiles for their clinic and user"
  ON patient_profiles
  FOR SELECT
  TO authenticated
  USING (
    clinic_id IN (
      SELECT clinic_id 
      FROM users 
      WHERE auth_id = auth.uid()
    )
    AND
    username IN (
      SELECT username 
      FROM users 
      WHERE auth_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert patient profiles for their clinic and user"
  ON patient_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (
    clinic_id IN (
      SELECT clinic_id 
      FROM users 
      WHERE auth_id = auth.uid()
    )
    AND
    username IN (
      SELECT username 
      FROM users 
      WHERE auth_id = auth.uid()
    )
  );

CREATE POLICY "Users can update patient profiles for their clinic and user"
  ON patient_profiles
  FOR UPDATE
  TO authenticated
  USING (
    clinic_id IN (
      SELECT clinic_id 
      FROM users 
      WHERE auth_id = auth.uid()
    )
    AND
    username IN (
      SELECT username 
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
    AND
    username IN (
      SELECT username 
      FROM users 
      WHERE auth_id = auth.uid()
    )
  );

-- Create index for better performance
CREATE INDEX patient_profiles_username_idx ON patient_profiles(username);