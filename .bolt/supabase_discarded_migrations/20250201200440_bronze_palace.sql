/*
  # Initial Database Schema
  
  1. Core Tables
    - users (combines user and clinic functionality)
    - doctors
    - appointments
    - reviews
    - patient_profiles
    - sequence_templates

  2. Security
    - RLS enabled on all tables
    - Policies for authenticated access
    - Auth user integration
*/

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Drop existing tables if they exist
DROP TABLE IF EXISTS sequence_templates CASCADE;
DROP TABLE IF EXISTS patient_profiles CASCADE;
DROP TABLE IF EXISTS reviews CASCADE;
DROP TABLE IF EXISTS appointments CASCADE;
DROP TABLE IF EXISTS doctors CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Create users table (combines user and clinic functionality)
CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_id uuid REFERENCES auth.users(id),
  username text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  name text NOT NULL,
  role text NOT NULL CHECK (role IN ('admin', 'receptionist')),
  -- Clinic-related fields
  clinic_code text UNIQUE NOT NULL,
  clinic_name text NOT NULL,
  clinic_address text NOT NULL,
  gmb_link text,
  logo text,
  primary_color text DEFAULT '#4F46E5',
  secondary_color text DEFAULT '#E5E7EB',
  contact_phone text,
  contact_email text,
  contact_whatsapp text,
  languages jsonb DEFAULT '{"en": {"name": "", "address": ""}}',
  default_language text DEFAULT 'en',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create doctors table
CREATE TABLE doctors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) NOT NULL,
  name text NOT NULL,
  contact_number text NOT NULL CHECK (contact_number ~ '^[0-9]{10}$'),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create appointments table
CREATE TABLE appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) NOT NULL,
  patient_name text NOT NULL,
  appointment_date date NOT NULL,
  appointment_time time NOT NULL,
  contact_number text NOT NULL,
  notes text,
  status text NOT NULL CHECK (status IN ('pending', 'completed', 'cancelled')) DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create reviews table
CREATE TABLE reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) NOT NULL,
  patient_name text NOT NULL,
  appointment_date date NOT NULL,
  contact_number text NOT NULL,
  treatment text,
  notes text,
  status text NOT NULL CHECK (status IN ('pending', 'sent')) DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create patient_profiles table
CREATE TABLE patient_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) NOT NULL,
  patient_name text NOT NULL,
  contact_number text NOT NULL,
  whatsapp_number text NOT NULL,
  profile_type text NOT NULL CHECK (profile_type IN ('General', 'Anemia', 'Liver & Kidney Health', 'Thyroid', 'Heart H', 'Diabetic')),
  last_visit_date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create sequence_templates table (global templates, not user-specific)
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

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE doctors ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE sequence_templates ENABLE ROW LEVEL SECURITY;

-- Create RLS Policies

-- Users policies
CREATE POLICY "Users can view their own data"
  ON users
  FOR SELECT
  TO authenticated
  USING (auth_id = auth.uid());

CREATE POLICY "Users can update their own data"
  ON users
  FOR UPDATE
  TO authenticated
  USING (auth_id = auth.uid())
  WITH CHECK (auth_id = auth.uid());

-- Doctors policies
CREATE POLICY "Users can view their own doctors"
  ON doctors
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can manage their own doctors"
  ON doctors
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Appointments policies
CREATE POLICY "Users can view their own appointments"
  ON appointments
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can manage their own appointments"
  ON appointments
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Reviews policies
CREATE POLICY "Users can view their own reviews"
  ON reviews
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can manage their own reviews"
  ON reviews
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Patient profiles policies
CREATE POLICY "Users can view their own patient profiles"
  ON patient_profiles
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can manage their own patient profiles"
  ON patient_profiles
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Sequence templates policies (read-only for all authenticated users)
CREATE POLICY "Users can view sequence templates"
  ON sequence_templates
  FOR SELECT
  TO authenticated
  USING (true);

-- Create indexes for better performance
CREATE INDEX doctors_user_id_idx ON doctors(user_id);
CREATE INDEX appointments_user_id_idx ON appointments(user_id);
CREATE INDEX reviews_user_id_idx ON reviews(user_id);
CREATE INDEX patient_profiles_user_id_idx ON patient_profiles(user_id);
CREATE INDEX sequence_templates_profile_type_idx ON sequence_templates(profile_type);

-- Insert default sequence templates
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
  ('Diabetic', 'Hi {patient_name}, remember to maintain your diet and exercise routine. Need any clarifications? - {clinic_name}', 30, 2);

-- Create demo user
INSERT INTO users (
  username,
  password_hash,
  name,
  role,
  clinic_code,
  clinic_name,
  clinic_address
) VALUES (
  'admin',
  crypt('admin123', gen_salt('bf')),
  'Demo Admin',
  'admin',
  'DEMO123',
  'Demo Clinic',
  '123 Healthcare Street, Medical District'
);

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