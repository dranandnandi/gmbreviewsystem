/*
  # Initial Schema Setup for Clinic Management System

  1. New Tables
    - `clinic_settings`
      - Basic clinic information and customization
      - Stores clinic name, address, branding colors, etc.
    - `users`
      - Staff accounts for clinic management
      - Includes admins and receptionists
    - `doctors`
      - Doctor profiles for each clinic
      - Stores name and specialization
    
  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated access
    - Secure password handling with pgcrypto
    
  3. Functions
    - Password verification function
*/

-- Enable pgcrypto extension for password hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Clinic Settings Table
CREATE TABLE IF NOT EXISTS clinic_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_code text UNIQUE NOT NULL,
  name text NOT NULL,
  address text NOT NULL,
  gmb_link text,
  logo text,
  primary_color text,
  secondary_color text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Users Table
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid REFERENCES clinic_settings(id),
  username text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  name text NOT NULL,
  role text NOT NULL CHECK (role IN ('admin', 'receptionist', 'super_admin')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Doctors Table
CREATE TABLE IF NOT EXISTS doctors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid REFERENCES clinic_settings(id),
  name text NOT NULL,
  specialization text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Password verification function
CREATE OR REPLACE FUNCTION verify_user_password(
  username_input text,
  password_input text
) RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM users
    WHERE username = username_input
    AND password_hash = crypt(password_input, password_hash)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enable RLS
ALTER TABLE clinic_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE doctors ENABLE ROW LEVEL SECURITY;

-- Clinic Settings Policies
CREATE POLICY "Allow authenticated read access to clinic_settings"
  ON clinic_settings
  FOR SELECT
  TO authenticated
  USING (true);

-- Users Policies
CREATE POLICY "Allow authenticated read access to users"
  ON users
  FOR SELECT
  TO authenticated
  USING (true);

-- Doctors Policies
CREATE POLICY "Allow authenticated read access to doctors"
  ON doctors
  FOR SELECT
  TO authenticated
  USING (true);

-- Insert sample data for testing
INSERT INTO clinic_settings (clinic_code, name, address, gmb_link)
VALUES (
  'DEMO123',
  'Demo Clinic',
  '123 Healthcare Street, Medical District',
  'https://g.page/demo-clinic'
) ON CONFLICT DO NOTHING;

-- Insert a demo admin user (password: admin123)
INSERT INTO users (clinic_id, username, password_hash, name, role)
SELECT 
  id as clinic_id,
  'admin',
  crypt('admin123', gen_salt('bf')),
  'Demo Admin',
  'admin'
FROM clinic_settings
WHERE clinic_code = 'DEMO123'
ON CONFLICT DO NOTHING;

-- Insert some demo doctors
INSERT INTO doctors (clinic_id, name, specialization)
SELECT 
  id as clinic_id,
  'Dr. John Smith',
  'General Medicine'
FROM clinic_settings
WHERE clinic_code = 'DEMO123'
ON CONFLICT DO NOTHING;

INSERT INTO doctors (clinic_id, name, specialization)
SELECT 
  id as clinic_id,
  'Dr. Sarah Johnson',
  'Pediatrics'
FROM clinic_settings
WHERE clinic_code = 'DEMO123'
ON CONFLICT DO NOTHING;