/*
  # Add Clinic-Based RLS Policies

  1. Changes
    - Add clinic-based RLS policies while maintaining user-based access
    - Update existing policies to include both user_id and clinic_id checks
    - Ensure proper access control for patient profiles and sequence templates

  2. Security
    - Maintain user_id based access control
    - Add clinic_id based access control
    - Ensure users can only access data within their clinic
*/

-- Drop existing policies first
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "Users can view their own patient profiles" ON patient_profiles;
  DROP POLICY IF EXISTS "Users can insert their own patient profiles" ON patient_profiles;
  DROP POLICY IF EXISTS "Users can update their own patient profiles" ON patient_profiles;
  DROP POLICY IF EXISTS "Users can view sequence templates for their clinic" ON sequence_templates;
END $$;

-- Create new combined policies for patient_profiles
CREATE POLICY "Users can view patient profiles for their clinic"
  ON patient_profiles
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() AND
    clinic_id IN (
      SELECT clinic_id 
      FROM users 
      WHERE auth_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert patient profiles for their clinic"
  ON patient_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid() AND
    clinic_id IN (
      SELECT clinic_id 
      FROM users 
      WHERE auth_id = auth.uid()
    )
  );

CREATE POLICY "Users can update patient profiles for their clinic"
  ON patient_profiles
  FOR UPDATE
  TO authenticated
  USING (
    user_id = auth.uid() AND
    clinic_id IN (
      SELECT clinic_id 
      FROM users 
      WHERE auth_id = auth.uid()
    )
  )
  WITH CHECK (
    user_id = auth.uid() AND
    clinic_id IN (
      SELECT clinic_id 
      FROM users 
      WHERE auth_id = auth.uid()
    )
  );

-- Create new policy for sequence_templates with clinic check
CREATE POLICY "Users can access sequence templates for their clinic"
  ON sequence_templates
  FOR ALL
  TO authenticated
  USING (
    clinic_id IN (
      SELECT clinic_id 
      FROM users 
      WHERE auth_id = auth.uid()
    )
  );