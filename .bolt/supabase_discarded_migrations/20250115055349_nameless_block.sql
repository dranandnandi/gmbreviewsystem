/*
  # Add RLS Policies for CRUD Operations

  1. Changes
    - Add INSERT policies for doctors table
    - Add UPDATE policies for doctors table
    - Add DELETE policies for doctors table
    - Add UPDATE policies for clinic_settings table
  
  2. Security
    - Only authenticated users with matching clinic_id can perform operations
    - Ensures data isolation between clinics
*/

-- Doctors table policies
CREATE POLICY "Users can insert doctors for their clinic"
  ON doctors
  FOR INSERT
  TO authenticated
  WITH CHECK (
    clinic_id IN (
      SELECT clinic_id 
      FROM users 
      WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can update doctors in their clinic"
  ON doctors
  FOR UPDATE
  TO authenticated
  USING (
    clinic_id IN (
      SELECT clinic_id 
      FROM users 
      WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    clinic_id IN (
      SELECT clinic_id 
      FROM users 
      WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can delete doctors in their clinic"
  ON doctors
  FOR DELETE
  TO authenticated
  USING (
    clinic_id IN (
      SELECT clinic_id 
      FROM users 
      WHERE id = auth.uid()
    )
  );

-- Clinic settings policies
CREATE POLICY "Users can update their clinic settings"
  ON clinic_settings
  FOR UPDATE
  TO authenticated
  USING (
    id IN (
      SELECT clinic_id 
      FROM users 
      WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    id IN (
      SELECT clinic_id 
      FROM users 
      WHERE id = auth.uid()
    )
  );