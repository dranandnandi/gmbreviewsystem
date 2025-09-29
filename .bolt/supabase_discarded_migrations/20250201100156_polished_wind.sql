/*
  # Patient Profiles and Sequence Templates

  1. New Tables
    - `patient_profiles`
      - Patient information and profile type
      - RLS enabled with clinic-based access
    - `sequence_templates`
      - Message templates for different profile types
      - RLS enabled with clinic-based access

  2. Security
    - Enable RLS on both tables
    - Add policies for authenticated users
    - Drop existing policies to avoid conflicts

  3. Data
    - Add default sequence templates for each clinic
*/

-- Drop existing tables if they exist to avoid conflicts
DROP TABLE IF EXISTS patient_profiles CASCADE;
DROP TABLE IF EXISTS sequence_templates CASCADE;

-- Create patient_profiles table
CREATE TABLE patient_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_name text NOT NULL,
  contact_number text NOT NULL,
  profile_type text NOT NULL CHECK (profile_type IN ('Anemia', 'Liver & Anemia', 'Thyroid', 'Heart H', 'Diabetic')),
  clinic_id uuid REFERENCES clinic_settings(id) NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create sequence_templates table
CREATE TABLE sequence_templates (
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
CREATE INDEX patient_profiles_clinic_id_idx ON patient_profiles(clinic_id);
CREATE INDEX sequence_templates_clinic_id_idx ON sequence_templates(clinic_id);
CREATE INDEX sequence_templates_profile_type_idx ON sequence_templates(profile_type);

-- Insert default sequence templates for each clinic and profile type
INSERT INTO sequence_templates (profile_type, message_template, sequence_order, clinic_id)
SELECT 
  t.profile_type,
  t.message_template,
  t.sequence_order,
  cs.id as clinic_id
FROM clinic_settings cs
CROSS JOIN (
  VALUES 
    ('Anemia', 'Hello {patient_name}, this is your first follow-up message for anemia treatment. How are you feeling?', 1),
    ('Anemia', 'Hi {patient_name}, remember to maintain a balanced diet rich in iron. Have you noticed any improvements?', 2),
    ('Liver & Anemia', 'Hello {patient_name}, this is your first follow-up for liver and anemia treatment. How are you doing?', 1),
    ('Liver & Anemia', 'Hi {patient_name}, please remember to take your medications regularly. Any side effects to report?', 2),
    ('Thyroid', 'Hello {patient_name}, this is your first thyroid treatment follow-up. How are you feeling?', 1),
    ('Thyroid', 'Hi {patient_name}, have you noticed any changes in your energy levels? Remember your medication schedule.', 2),
    ('Heart H', 'Hello {patient_name}, this is your first cardiac health follow-up. How are you feeling?', 1),
    ('Heart H', 'Hi {patient_name}, remember to monitor your blood pressure regularly. Any concerns to discuss?', 2),
    ('Diabetic', 'Hello {patient_name}, this is your first diabetes management follow-up. How are your sugar levels?', 1),
    ('Diabetic', 'Hi {patient_name}, remember to maintain your diet and exercise routine. Need any clarifications?', 2)
  ) t(profile_type, message_template, sequence_order)
ON CONFLICT (clinic_id, profile_type, sequence_order) DO UPDATE
SET message_template = EXCLUDED.message_template;