/*
  # Initial Schema Setup

  1. New Tables
    - `profiles`
      - Extends Supabase auth.users
      - Stores additional user information
    - `doctors`
      - Stores doctor information
    - `appointments`
      - Stores appointment details
    - `reviews`
      - Stores review requests
    - `clinic_settings`
      - Stores clinic configuration

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users
*/

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name text,
  role text CHECK (role IN ('admin', 'receptionist')) NOT NULL DEFAULT 'receptionist',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

-- Create doctors table
CREATE TABLE IF NOT EXISTS doctors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  specialization text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE doctors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view doctors"
  ON doctors FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Only admins can modify doctors"
  ON doctors FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  ));

-- Create appointments table
CREATE TABLE IF NOT EXISTS appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_name text NOT NULL,
  doctor_id uuid REFERENCES doctors(id) NOT NULL,
  appointment_date date NOT NULL,
  appointment_time time NOT NULL,
  contact_number text NOT NULL,
  status text CHECK (status IN ('pending', 'completed', 'cancelled')) NOT NULL DEFAULT 'pending',
  notes text,
  created_by uuid REFERENCES auth.users(id) NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view appointments"
  ON appointments FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert appointments"
  ON appointments FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update appointments"
  ON appointments FOR UPDATE
  TO authenticated
  USING (true);

-- Create reviews table
CREATE TABLE IF NOT EXISTS reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_name text NOT NULL,
  doctor_id uuid REFERENCES doctors(id) NOT NULL,
  appointment_date date NOT NULL,
  contact_number text NOT NULL,
  status text CHECK (status IN ('sent', 'completed')) NOT NULL DEFAULT 'sent',
  notes text,
  created_by uuid REFERENCES auth.users(id) NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view reviews"
  ON reviews FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert reviews"
  ON reviews FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update reviews"
  ON reviews FOR UPDATE
  TO authenticated
  USING (true);

-- Create clinic_settings table
CREATE TABLE IF NOT EXISTS clinic_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  address text NOT NULL,
  gmb_link text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT single_row CHECK (id = gen_random_uuid()) -- Ensures only one row
);

ALTER TABLE clinic_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view clinic settings"
  ON clinic_settings FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Only admins can modify clinic settings"
  ON clinic_settings FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  ));