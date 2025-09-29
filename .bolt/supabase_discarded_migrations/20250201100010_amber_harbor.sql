/*
  # Add Patient Profiles and Sequence Templates with Policy Checks

  1. New Tables
    - `patient_profiles`
      - `id` (uuid, primary key)
      - `patient_name` (text)
      - `contact_number` (text)
      - `profile_type` (text, enum)
      - `clinic_id` (uuid, foreign key)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `sequence_templates`
      - `id` (uuid, primary key)
      - `profile_type` (text, enum)
      - `message_template` (text)
      - `sequence_order` (integer)
      - `clinic_id` (uuid, foreign key)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on both tables
    - Add policies for authenticated users with existence checks
*/

-- Create patient_profiles table
CREATE TABLE IF NOT EXISTS patient_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_name text NOT NULL,
  contact_number text NOT NULL,
  profile_type text NOT NULL CHECK (profile_type IN ('Anemia', 'Liver & Anemia', 'Thyroid', 'Heart H', 'Diabetic')),
  clinic_id uuid REFERENCES clinic_settings(id) NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create sequence_templates table
CREATE TABLE IF NOT EXISTS sequence_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_type text NOT NULL CHECK (profile_type IN ('Anemia', 'Liver & Anemia', 'Thyroid', 'Heart H', 'Diabetic')),
  message_template text NOT NULL,
  sequence_order integer NOT NULL,
  clinic_id uuid REFERENCES clinic_settings(id) NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(clinic_id, profile_type, sequence_order)
);

-- Enable Row Level Security
ALTER TABLE patient_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE sequence_templates ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DO $$ 
BEGIN
  -- Patient profiles policies
  DROP POLICY IF EXISTS "Users can view patient profiles for their clinic" ON patient_profiles;
  DROP POLICY IF EXISTS "Users can insert patient profiles for their clinic" ON patient_profiles;
  DROP POLICY IF EXISTS "Users can update patient profiles in their clinic" ON patient_profiles;
  
  -- Sequence templates policies
  DROP POLICY IF EXISTS "Users can view sequence templates for their clinic" ON sequence_templates;
  DROP POLICY IF EXISTS "Users can insert sequence templates for their clinic" ON sequence_templates;
  DROP POLICY IF EXISTS "Users can update sequence templates in their clinic" ON sequence_templates;
END $$;

-- Create policies for patient_profiles
CREATE POLICY "Users can view patient profiles for their clinic"
  ON patient_profiles
  FOR SELECT
  TO authenticated
  USING (
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
    clinic_id IN (
      SELECT clinic_id 
      FROM users 
      WHERE auth_id = auth.uid()
    )
  );

CREATE POLICY "Users can update patient profiles in their clinic"
  ON patient_profiles
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

-- Create policies for sequence_templates
CREATE POLICY "Users can view sequence templates for their clinic"
  ON sequence_templates
  FOR SELECT
  TO authenticated
  USING (
    clinic_id IN (
      SELECT clinic_id 
      FROM users 
      WHERE auth_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert sequence templates for their clinic"
  ON sequence_templates
  FOR INSERT
  TO authenticated
  WITH CHECK (
    clinic_id IN (
      SELECT clinic_id 
      FROM users 
      WHERE auth_id = auth.uid()
    )
  );

CREATE POLICY "Users can update sequence templates in their clinic"
  ON sequence_templates
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

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS patient_profiles_clinic_id_idx ON patient_profiles(clinic_id);
CREATE INDEX IF NOT EXISTS sequence_templates_clinic_id_idx ON sequence_templates(clinic_id);
CREATE INDEX IF NOT EXISTS sequence_templates_profile_type_idx ON sequence_templates(profile_type);

-- Insert default sequence templates for each profile type
INSERT INTO sequence_templates (profile_type, message_template, sequence_order, clinic_id)
SELECT 
  profile_type,
  message_template,
  sequence_order,
  clinic_id
FROM (
  SELECT 
    unnest(ARRAY['Anemia', 'Liver & Anemia', 'Thyroid', 'Heart H', 'Diabetic']) as profile_type,
    'Hello {patient_name}, this is your first follow-up message. How are you feeling after your tests?' as message_template,
    1 as sequence_order,
    id as clinic_id
  FROM clinic_settings
) t
ON CONFLICT (clinic_id, profile_type, sequence_order) DO UPDATE
SET message_template = EXCLUDED.message_template;