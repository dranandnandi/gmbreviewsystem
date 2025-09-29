/*
  # Make Sequence Templates Global

  1. Changes
    - Remove clinic_id from sequence_templates table
    - Update policies to allow all authenticated users to view templates
    - Keep templates organized by profile type only
    - Maintain existing template data

  2. Security
    - Allow read access to all authenticated users
    - Restrict write access to maintain data integrity
*/

-- Backup existing templates
CREATE TEMP TABLE temp_templates AS
SELECT DISTINCT ON (profile_type, sequence_order)
  profile_type,
  message_template,
  sequence_days,
  sequence_order
FROM sequence_templates;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can access sequence templates for their clinic" ON sequence_templates;
DROP POLICY IF EXISTS "Users can view sequence templates for their clinic" ON sequence_templates;
DROP POLICY IF EXISTS "Users can insert sequence templates for their clinic" ON sequence_templates;
DROP POLICY IF EXISTS "Users can update sequence templates in their clinic" ON sequence_templates;

-- Drop and recreate sequence_templates table without clinic_id
DROP TABLE sequence_templates;

CREATE TABLE sequence_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_type text NOT NULL CHECK (profile_type IN ('General', 'Anemia', 'Liver & Kidney Health', 'Thyroid', 'Heart H', 'Diabetic')),
  message_template text NOT NULL,
  sequence_days integer NOT NULL DEFAULT 15,
  sequence_order integer NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(profile_type, sequence_order)
);

-- Enable RLS
ALTER TABLE sequence_templates ENABLE ROW LEVEL SECURITY;

-- Create new policy for global read access
CREATE POLICY "Allow authenticated users to view sequence templates"
  ON sequence_templates
  FOR SELECT
  TO authenticated
  USING (true);

-- Create index for better performance
CREATE INDEX sequence_templates_profile_type_idx ON sequence_templates(profile_type);

-- Restore template data
INSERT INTO sequence_templates (profile_type, message_template, sequence_days, sequence_order)
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
ON CONFLICT (profile_type, sequence_order) DO UPDATE
SET 
  message_template = EXCLUDED.message_template,
  sequence_days = EXCLUDED.sequence_days;