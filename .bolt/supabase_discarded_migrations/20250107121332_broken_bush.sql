-- Create tables
CREATE TABLE IF NOT EXISTS clinic_settings (
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

CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  role text CHECK (role IN ('super_admin', 'admin', 'receptionist')) NOT NULL DEFAULT 'receptionist',
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
  created_by uuid REFERENCES auth.users(id) NOT NULL,
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
  created_by uuid REFERENCES auth.users(id) NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE clinic_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE doctors ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

-- Basic RLS policies
CREATE POLICY "Users view own clinic" ON clinic_settings FOR SELECT USING (
  id IN (SELECT clinic_id FROM profiles WHERE id = auth.uid())
);

CREATE POLICY "Users view own profile" ON profiles FOR SELECT USING (
  id = auth.uid() OR clinic_id IN (SELECT clinic_id FROM profiles WHERE id = auth.uid())
);

CREATE POLICY "Users view clinic doctors" ON doctors FOR SELECT USING (
  clinic_id IN (SELECT clinic_id FROM profiles WHERE id = auth.uid())
);

CREATE POLICY "Users view clinic appointments" ON appointments FOR SELECT USING (
  clinic_id IN (SELECT clinic_id FROM profiles WHERE id = auth.uid())
);

CREATE POLICY "Users view clinic reviews" ON reviews FOR SELECT USING (
  clinic_id IN (SELECT clinic_id FROM profiles WHERE id = auth.uid())
);

-- Admin policies
CREATE POLICY "Admins manage clinic" ON clinic_settings FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Admins manage doctors" ON doctors FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Super admin policies
CREATE POLICY "Super admin manage all" ON profiles FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
);