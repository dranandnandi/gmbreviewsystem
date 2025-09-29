/*
  # Reset Database and Create Fresh Schema
  
  1. Drop existing data and tables
  2. Create new schema with clinic support
  3. Set up RLS policies
*/

-- First, drop all existing tables
DROP TABLE IF EXISTS reviews CASCADE;
DROP TABLE IF EXISTS appointments CASCADE;
DROP TABLE IF EXISTS doctors CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;
DROP TABLE IF EXISTS clinic_settings CASCADE;

-- Create clinic_settings table
CREATE TABLE clinic_settings (
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

ALTER TABLE clinic_settings ENABLE ROW LEVEL SECURITY;

-- Create profiles table
CREATE TABLE profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name text,
  role text CHECK (role IN ('admin', 'receptionist')) NOT NULL DEFAULT 'receptionist',
  clinic_id uuid REFERENCES clinic_settings(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Create doctors table
CREATE TABLE doctors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  specialization text NOT NULL,
  clinic_id uuid REFERENCES clinic_settings(id) NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE doctors ENABLE ROW LEVEL SECURITY;

-- Create appointments table
CREATE TABLE appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_name text NOT NULL,
  doctor_id uuid REFERENCES doctors(id) NOT NULL,
  appointment_date date NOT NULL,
  appointment_time time NOT NULL,
  contact_number text NOT NULL,
  status text CHECK (status IN ('pending', 'completed', 'cancelled')) NOT NULL DEFAULT 'pending',
  notes text,
  clinic_id uuid REFERENCES clinic_settings(id) NOT NULL,
  created_by uuid REFERENCES auth.users(id) NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

-- Create reviews table
CREATE TABLE reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_name text NOT NULL,
  doctor_id uuid REFERENCES doctors(id) NOT NULL,
  appointment_date date NOT NULL,
  contact_number text NOT NULL,
  status text CHECK (status IN ('sent', 'completed')) NOT NULL DEFAULT 'sent',
  notes text,
  clinic_id uuid REFERENCES clinic_settings(id) NOT NULL,
  created_by uuid REFERENCES auth.users(id) NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

-- Create RLS policies

-- Clinic Settings policies
CREATE POLICY "Users can view their clinic settings"
  ON clinic_settings FOR SELECT
  TO authenticated
  USING (id IN (
    SELECT clinic_id FROM profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Only admins can modify clinic settings"
  ON clinic_settings FOR ALL
  TO authenticated
  USING (id IN (
    SELECT clinic_id FROM profiles 
    WHERE id = auth.uid() AND role = 'admin'
  ));

-- Profiles policies
CREATE POLICY "Users can view profiles in their clinic"
  ON profiles FOR SELECT
  TO authenticated
  USING (clinic_id IN (
    SELECT clinic_id FROM profiles WHERE id = auth.uid()
  ));

-- Doctors policies
CREATE POLICY "Users can view their clinic's doctors"
  ON doctors FOR SELECT
  TO authenticated
  USING (clinic_id IN (
    SELECT clinic_id FROM profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Users can modify their clinic's doctors"
  ON doctors FOR ALL
  TO authenticated
  USING (clinic_id IN (
    SELECT clinic_id FROM profiles WHERE id = auth.uid()
  ));

-- Appointments policies
CREATE POLICY "Users can view their clinic's appointments"
  ON appointments FOR SELECT
  TO authenticated
  USING (clinic_id IN (
    SELECT clinic_id FROM profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Users can modify their clinic's appointments"
  ON appointments FOR ALL
  TO authenticated
  USING (clinic_id IN (
    SELECT clinic_id FROM profiles WHERE id = auth.uid()
  ));

-- Reviews policies
CREATE POLICY "Users can view their clinic's reviews"
  ON reviews FOR SELECT
  TO authenticated
  USING (clinic_id IN (
    SELECT clinic_id FROM profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Users can modify their clinic's reviews"
  ON reviews FOR ALL
  TO authenticated
  USING (clinic_id IN (
    SELECT clinic_id FROM profiles WHERE id = auth.uid()
  ));