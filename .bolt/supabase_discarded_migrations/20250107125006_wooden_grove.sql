-- Drop existing tables
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

-- Create users table (replacing auth.users dependency)
CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  name text NOT NULL,
  role text CHECK (role IN ('super_admin', 'admin', 'receptionist')) NOT NULL,
  clinic_id uuid REFERENCES clinic_settings(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create doctors table
CREATE TABLE doctors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  specialization text NOT NULL,
  clinic_id uuid REFERENCES clinic_settings(id) NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

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
  created_by uuid REFERENCES users(id) NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

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
  created_by uuid REFERENCES users(id) NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE clinic_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE doctors ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

-- Create default super admin
INSERT INTO users (username, password_hash, name, role)
VALUES (
  'superadmin',
  crypt('admin123', gen_salt('bf')),
  'Super Admin',
  'super_admin'
);

-- Create RLS policies
CREATE POLICY "Super admin access all"
  ON users FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role = 'super_admin'
    )
  );

CREATE POLICY "Users view own clinic"
  ON clinic_settings FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT clinic_id FROM users 
      WHERE id = auth.uid()
    )
  );

CREATE POLICY "Super admin manage clinics"
  ON clinic_settings FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role = 'super_admin'
    )
  );