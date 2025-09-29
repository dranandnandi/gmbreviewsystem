/*
  # Initial Database Schema Setup

  1. Tables
    - clinic_settings
    - users
    - doctors
    - appointments
    - reviews

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users
*/

-- Create tables if they don't exist
CREATE TABLE IF NOT EXISTS clinic_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  address text NOT NULL,
  gmb_link text NOT NULL,
  clinic_code text UNIQUE NOT NULL,
  logo text,
  primary_color text DEFAULT '#4F46E5',
  secondary_color text DEFAULT '#E5E7EB',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username text UNIQUE NOT NULL,
  password text NOT NULL,
  name text NOT NULL,
  role text CHECK (role IN ('super_admin', 'admin', 'receptionist')) NOT NULL,
  clinic_id uuid REFERENCES clinic_settings(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS doctors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  specialization text NOT NULL,
  clinic_id uuid REFERENCES clinic_settings(id) NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_name text NOT NULL,
  doctor_id uuid REFERENCES doctors(id) NOT NULL,
  appointment_date date NOT NULL,
  appointment_time time NOT NULL,
  contact_number text NOT NULL,
  status text CHECK (status IN ('pending', 'completed', 'cancelled')) NOT NULL DEFAULT 'pending',
  notes text,
  clinic_id uuid REFERENCES clinic_settings(id) NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_name text NOT NULL,
  doctor_id uuid REFERENCES doctors(id) NOT NULL,
  appointment_date date NOT NULL,
  contact_number text NOT NULL,
  status text CHECK (status IN ('sent', 'completed')) NOT NULL DEFAULT 'sent',
  notes text,
  clinic_id uuid REFERENCES clinic_settings(id) NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE clinic_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE doctors ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Allow all access to clinic_settings"
  ON clinic_settings FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow all access to users"
  ON users FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow all access to doctors"
  ON doctors FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow all access to appointments"
  ON appointments FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow all access to reviews"
  ON reviews FOR ALL
  USING (true)
  WITH CHECK (true);

-- Insert sample clinic
INSERT INTO clinic_settings (name, address, gmb_link, clinic_code)
VALUES (
  'Sample Clinic',
  '123 Healthcare Street, Medical City',
  'https://g.page/sample-clinic',
  'CLINIC001'
);

-- Insert admin user
INSERT INTO users (username, password, name, role, clinic_id)
VALUES (
  'admin',
  crypt('admin123', gen_salt('bf')),
  'Admin User',
  'admin',
  (SELECT id FROM clinic_settings WHERE clinic_code = 'CLINIC001')
);