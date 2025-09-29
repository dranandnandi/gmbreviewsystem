/*
  # Initial Database Setup

  1. Tables
    - clinic_settings: Stores clinic information and configuration
    - users: Manages user accounts and authentication
    - doctors: Stores doctor information
  
  2. Functions
    - verify_user_password: Secure password verification
  
  3. Security
    - Enables RLS on all tables
    - Sets up basic access policies
    - Uses pgcrypto for password hashing
  
  4. Sample Data
    - Creates a demo clinic (DEMO123)
    - Adds an admin user (username: admin, password: admin123)
    - Adds sample doctors
*/

-- Enable pgcrypto extension for password hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Drop existing tables if they exist
DROP TABLE IF EXISTS doctors CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS clinic_settings CASCADE;

-- Clinic Settings Table
CREATE TABLE clinic_settings (
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
CREATE TABLE users (
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
CREATE TABLE doctors (
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
CREATE POLICY "Allow public read access to clinic_settings"
  ON clinic_settings
  FOR SELECT
  TO PUBLIC
  USING (true);

-- Users Policies
CREATE POLICY "Allow public read access to users"
  ON users
  FOR SELECT
  TO PUBLIC
  USING (true);

-- Doctors Policies
CREATE POLICY "Allow public read access to doctors"
  ON doctors
  FOR SELECT
  TO PUBLIC
  USING (true);

-- Insert sample data
INSERT INTO clinic_settings (clinic_code, name, address, gmb_link)
VALUES (
  'DEMO123',
  'Demo Clinic',
  '123 Healthcare Street, Medical District',
  'https://g.page/demo-clinic'
);

-- Get the clinic ID
DO $$
DECLARE
  clinic_id uuid;
BEGIN
  SELECT id INTO clinic_id FROM clinic_settings WHERE clinic_code = 'DEMO123';
  
  -- Insert demo admin user
  INSERT INTO users (clinic_id, username, password_hash, name, role)
  VALUES (
    clinic_id,
    'admin',
    crypt('admin123', gen_salt('bf')),
    'Demo Admin',
    'admin'
  );
  
  -- Insert demo doctors
  INSERT INTO doctors (clinic_id, name, specialization)
  VALUES
    (clinic_id, 'Dr. John Smith', 'General Medicine'),
    (clinic_id, 'Dr. Sarah Johnson', 'Pediatrics');
END $$;