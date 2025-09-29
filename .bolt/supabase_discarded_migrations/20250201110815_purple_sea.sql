/*
  # Add Patient Profiles and Sequence Templates

  1. New Tables
    - patient_profiles
      - id (uuid, primary key)
      - patient_name (text)
      - contact_number (text)
      - whatsapp_number (text)
      - profile_type (text)
      - last_visit_date (date)
      - clinic_id (uuid, foreign key)
      - created_at, updated_at (timestamps)
    
    - sequence_templates
      - id (uuid, primary key)
      - profile_type (text)
      - message_template (text)
      - sequence_days (integer)
      - sequence_order (integer)
      - clinic_id (uuid, foreign key)
      - created_at, updated_at (timestamps)

  2. Security
    - Enable RLS on both tables
    - Add policies for authenticated users
*/

-- Drop existing tables if they exist
DROP TABLE IF EXISTS patient_profiles CASCADE;
DROP TABLE IF EXISTS sequence_templates CASCADE;

-- Create patient_profiles table
CREATE TABLE patient_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_name text NOT NULL,
  contact_number text NOT NULL,
  whatsapp_number text NOT NULL,
  profile_type text NOT NULL CHECK (profile_type IN ('General', 'Anemia', 'Liver & Kidney Health', 'Thyroid', 'Heart H', 'Diabetic')),
  last_visit_date date NOT NULL DEFAULT CURRENT_DATE,
  clinic_id uuid REFERENCES clinic_settings(id) NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create sequence_templates table
CREATE TABLE sequence_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_type text NOT NULL CHECK (profile_type IN ('General', 'Anemia', 'Liver & Kidney Health', 'Thyroid', 'Heart H', 'Diabetic')),
  message_template text NOT NULL,
  sequence_days integer NOT NULL DEFAULT 15,
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
INSERT INTO sequence_templates (profile_type, message_template, sequence_days, sequence_order, clinic_id)
SELECT 
  t.profile_type,
  t.message_template,
  t.sequence_days,
  t.sequence_order,
  cs.id as clinic_id
FROM clinic_settings cs
CROSS JOIN (
  VALUES 
    ('General', 'Hello {patient_name}, this is your first follow-up message from {clinic_name}. How are you feeling after your recent visit?', 15, 1),
    ('General', 'Hi {patient_name}, just checking in on your health journey. Any concerns you''d like to discuss with us at {clinic_name}?', 30, 2),
    ('Anemia', 'Hello {patient_name}, this is your first follow-up message for anemia treatment from {clinic_name}. How are you feeling?', 15, 1),
    ('Anemia', 'Hi {patient_name}, remember to maintain a balanced diet rich in iron. Have you noticed any improvements? - {clinic_name}', 30, 2),
    ('Liver & Kidney Health', 'Hello {patient_name}, this is your first follow-up for liver and kidney health from {clinic_name}. How are you doing?', 15, 1),
    ('Liver & Kidney Health', 'Hi {patient_name}, please remember to take your medications regularly. Any side effects to report? - {clinic_name}', 30, 2),
    ('Thyroid', 'Hello {patient_name}, this is your first thyroid treatment follow-up from {clinic_name}. How are you feeling?', 15, 1),
    ('Thyroid', 'Hi {patient_name}, have you noticed any changes in your energy levels? Remember your medication schedule. - {clinic_name}', 30, 2),
    ('Heart H', 'Hello {patient_name}, this is your first cardiac health follow-up from {clinic_name}. How are you feeling?', 15, 1),
    ('Heart H', 'Hi {patient_name}, remember to monitor your blood pressure regularly. Any concerns to discuss? - {clinic_name}', 30, 2),
    ('Diabetic', 'Hello {patient_name}, this is your first diabetes management follow-up from {clinic_name}. How are your sugar levels?', 15, 1),
    ('Diabetic', 'Hi {patient_name}, remember to maintain your diet and exercise routine. Need any clarifications? - {clinic_name}', 30, 2)
  ) t(profile_type, message_template, sequence_days, sequence_order)
ON CONFLICT (clinic_id, profile_type, sequence_order) DO UPDATE
SET 
  message_template = EXCLUDED.message_template,
  sequence_days = EXCLUDED.sequence_days;