/*
  # Add Missing Tables

  1. New Tables
    - `doctors`
    - `appointments`
    - `reviews`
    - `clinic_settings`

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users
*/

-- Create doctors table if not exists
CREATE TABLE IF NOT EXISTS doctors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  specialization text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE doctors ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Anyone can view doctors"
    ON doctors FOR SELECT
    TO authenticated
    USING (true);
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "Only admins can modify doctors"
    ON doctors FOR ALL
    TO authenticated
    USING (EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    ));
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create appointments table if not exists
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

DO $$ BEGIN
  CREATE POLICY "Users can view appointments"
    ON appointments FOR SELECT
    TO authenticated
    USING (true);
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can insert appointments"
    ON appointments FOR INSERT
    TO authenticated
    WITH CHECK (true);
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can update appointments"
    ON appointments FOR UPDATE
    TO authenticated
    USING (true);
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create reviews table if not exists
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

DO $$ BEGIN
  CREATE POLICY "Users can view reviews"
    ON reviews FOR SELECT
    TO authenticated
    USING (true);
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can insert reviews"
    ON reviews FOR INSERT
    TO authenticated
    WITH CHECK (true);
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can update reviews"
    ON reviews FOR UPDATE
    TO authenticated
    USING (true);
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create clinic_settings table if not exists
CREATE TABLE IF NOT EXISTS clinic_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  address text NOT NULL,
  gmb_link text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT single_row CHECK (id = gen_random_uuid())
);

ALTER TABLE clinic_settings ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Users can view clinic settings"
    ON clinic_settings FOR SELECT
    TO authenticated
    USING (true);
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "Only admins can modify clinic settings"
    ON clinic_settings FOR ALL
    TO authenticated
    USING (EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    ));
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;