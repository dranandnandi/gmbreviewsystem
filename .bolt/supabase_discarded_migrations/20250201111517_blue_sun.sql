/*
  # Update Patient Profiles Policies

  1. Changes
    - Update RLS policies to use auth.uid() directly instead of clinic_id
    - Add user_id column to patient_profiles table
    - Update existing policies to use user_id
  
  2. Security
    - Ensure users can only access their own patient profiles
    - Maintain clinic_id for organizational purposes but use user_id for access control
*/

-- Add user_id column to patient_profiles
ALTER TABLE patient_profiles 
ADD COLUMN user_id uuid REFERENCES auth.users(id);

-- Update user_id for existing records
UPDATE patient_profiles pp
SET user_id = u.auth_id
FROM users u
WHERE pp.username = u.username;

-- Make user_id NOT NULL after updating existing records
ALTER TABLE patient_profiles 
ALTER COLUMN user_id SET NOT NULL;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view patient profiles for their clinic and user" ON patient_profiles;
DROP POLICY IF EXISTS "Users can insert patient profiles for their clinic and user" ON patient_profiles;
DROP POLICY IF EXISTS "Users can update patient profiles for their clinic and user" ON patient_profiles;

-- Create new policies based on user_id
CREATE POLICY "Users can view their own patient profiles"
  ON patient_profiles
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own patient profiles"
  ON patient_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own patient profiles"
  ON patient_profiles
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Create index for better performance
CREATE INDEX patient_profiles_user_id_idx ON patient_profiles(user_id);