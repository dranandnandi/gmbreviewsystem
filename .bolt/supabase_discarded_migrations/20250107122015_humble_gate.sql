/*
  # Schema Update
  
  1. Tables
    - Ensures tables exist with proper structure
    - Adds IF NOT EXISTS checks
  2. Security
    - Enables RLS
    - Creates basic access policies
*/

-- Drop existing policies first to avoid conflicts
DO $$ 
BEGIN
  -- Drop policies if they exist
  DROP POLICY IF EXISTS "Users view own profile" ON profiles;
  DROP POLICY IF EXISTS "Users view clinic members" ON profiles;
  DROP POLICY IF EXISTS "Users view clinic doctors" ON doctors;
  DROP POLICY IF EXISTS "Users view clinic appointments" ON appointments;
  DROP POLICY IF EXISTS "Users view clinic reviews" ON reviews;
EXCEPTION
  WHEN undefined_table THEN null;
END $$;

-- Create tables if they don't exist
CREATE TABLE IF NOT EXISTS clinic_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  address text NOT NULL,
  gmb_link text NOT NULL,
  logo text,
  primary_color text,
  secondary_color text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

DO $$ 
BEGIN
  ALTER TABLE clinic_settings ENABLE ROW LEVEL SECURITY;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create basic RLS policies
DO $$ 
BEGIN
  CREATE POLICY "Users view own profile" ON profiles
    FOR SELECT TO authenticated
    USING (id = auth.uid());

  CREATE POLICY "Users view clinic members" ON profiles
    FOR SELECT TO authenticated
    USING (clinic_id IN (
      SELECT clinic_id FROM profiles WHERE id = auth.uid()
    ));

  CREATE POLICY "Users view clinic doctors" ON doctors
    FOR SELECT TO authenticated
    USING (clinic_id IN (
      SELECT clinic_id FROM profiles WHERE id = auth.uid()
    ));

  CREATE POLICY "Users view clinic appointments" ON appointments
    FOR SELECT TO authenticated
    USING (clinic_id IN (
      SELECT clinic_id FROM profiles WHERE id = auth.uid()
    ));

  CREATE POLICY "Users view clinic reviews" ON reviews
    FOR SELECT TO authenticated
    USING (clinic_id IN (
      SELECT clinic_id FROM profiles WHERE id = auth.uid()
    ));
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;