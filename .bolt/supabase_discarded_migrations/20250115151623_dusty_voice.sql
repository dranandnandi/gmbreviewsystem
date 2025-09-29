/*
  # Create appointments and reviews tables

  1. New Tables
    - `appointments`
      - `id` (uuid, primary key)
      - `clinic_id` (uuid, foreign key to clinic_settings)
      - `doctor_id` (uuid, foreign key to doctors)
      - `patient_name` (text)
      - `appointment_date` (date)
      - `appointment_time` (time)
      - `contact_number` (text)
      - `notes` (text)
      - `status` (text: pending, completed, cancelled)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

    - `reviews`
      - `id` (uuid, primary key)
      - `clinic_id` (uuid, foreign key to clinic_settings)
      - `doctor_id` (uuid, foreign key to doctors)
      - `patient_name` (text)
      - `appointment_date` (date)
      - `contact_number` (text)
      - `treatment` (text)
      - `notes` (text)
      - `status` (text: pending, sent)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on both tables
    - Add policies for authenticated users to manage their clinic's data
*/

-- Create appointments table
CREATE TABLE appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid REFERENCES clinic_settings(id) NOT NULL,
  doctor_id uuid REFERENCES doctors(id) NOT NULL,
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
  clinic_id uuid REFERENCES clinic_settings(id) NOT NULL,
  doctor_id uuid REFERENCES doctors(id) NOT NULL,
  patient_name text NOT NULL,
  appointment_date date NOT NULL,
  contact_number text NOT NULL,
  treatment text,
  notes text,
  status text NOT NULL CHECK (status IN ('pending', 'sent')) DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

-- Appointments policies
CREATE POLICY "Users can view appointments for their clinic"
  ON appointments
  FOR SELECT
  TO authenticated
  USING (
    clinic_id IN (
      SELECT clinic_id 
      FROM users 
      WHERE auth_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert appointments for their clinic"
  ON appointments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    clinic_id IN (
      SELECT clinic_id 
      FROM users 
      WHERE auth_id = auth.uid()
    )
  );

CREATE POLICY "Users can update appointments in their clinic"
  ON appointments
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

-- Reviews policies
CREATE POLICY "Users can view reviews for their clinic"
  ON reviews
  FOR SELECT
  TO authenticated
  USING (
    clinic_id IN (
      SELECT clinic_id 
      FROM users 
      WHERE auth_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert reviews for their clinic"
  ON reviews
  FOR INSERT
  TO authenticated
  WITH CHECK (
    clinic_id IN (
      SELECT clinic_id 
      FROM users 
      WHERE auth_id = auth.uid()
    )
  );

CREATE POLICY "Users can update reviews in their clinic"
  ON reviews
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
CREATE INDEX appointments_clinic_id_idx ON appointments(clinic_id);
CREATE INDEX appointments_doctor_id_idx ON appointments(doctor_id);
CREATE INDEX reviews_clinic_id_idx ON reviews(clinic_id);
CREATE INDEX reviews_doctor_id_idx ON reviews(doctor_id);