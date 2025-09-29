-- Create tables with IF NOT EXISTS
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
DO $$ 
BEGIN
  ALTER TABLE clinic_settings ENABLE ROW LEVEL SECURITY;
  ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
  ALTER TABLE doctors ENABLE ROW LEVEL SECURITY;
  ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
  ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Drop existing policies to avoid conflicts
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "Enable read access for own profile" ON profiles;
  DROP POLICY IF EXISTS "Enable read access for clinic members" ON profiles;
  DROP POLICY IF EXISTS "Users view own clinic" ON clinic_settings;
  DROP POLICY IF EXISTS "Users view clinic doctors" ON doctors;
  DROP POLICY IF EXISTS "Users view clinic appointments" ON appointments;
  DROP POLICY IF EXISTS "Users view clinic reviews" ON reviews;
EXCEPTION
  WHEN undefined_object THEN null;
END $$;

-- Create new policies
DO $$ 
BEGIN
  -- Profiles policies
  CREATE POLICY "View own profile"
    ON profiles FOR SELECT
    TO authenticated
    USING (id = auth.uid());

  CREATE POLICY "View clinic members"
    ON profiles FOR SELECT
    TO authenticated
    USING (
      clinic_id IN (
        SELECT p.clinic_id 
        FROM profiles p 
        WHERE p.id = auth.uid()
        AND p.clinic_id IS NOT NULL
      )
    );

  -- Clinic settings policies
  CREATE POLICY "View own clinic"
    ON clinic_settings FOR SELECT
    TO authenticated
    USING (id IN (
      SELECT clinic_id FROM profiles WHERE id = auth.uid()
    ));

  -- Doctors policies
  CREATE POLICY "View clinic doctors"
    ON doctors FOR SELECT
    TO authenticated
    USING (clinic_id IN (
      SELECT clinic_id FROM profiles WHERE id = auth.uid()
    ));

  -- Appointments policies
  CREATE POLICY "View clinic appointments"
    ON appointments FOR SELECT
    TO authenticated
    USING (clinic_id IN (
      SELECT clinic_id FROM profiles WHERE id = auth.uid()
    ));

  -- Reviews policies
  CREATE POLICY "View clinic reviews"
    ON reviews FOR SELECT
    TO authenticated
    USING (clinic_id IN (
      SELECT clinic_id FROM profiles WHERE id = auth.uid()
    ));
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create super admin user if not exists
DO $$ 
DECLARE
  super_admin_id uuid;
BEGIN
  -- Check if super admin exists
  IF NOT EXISTS (
    SELECT 1 FROM auth.users 
    WHERE email = 'super@admin.com'
  ) THEN
    -- Insert into auth.users without ON CONFLICT
    INSERT INTO auth.users (
      instance_id,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_user_meta_data,
      created_at,
      updated_at,
      is_sso_user,
      aud,
      role
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      'super@admin.com',
      crypt('SuperAdmin123!', gen_salt('bf')),
      now(),
      jsonb_build_object(
        'name', 'Super Admin',
        'role', 'super_admin'
      ),
      now(),
      now(),
      false,
      'authenticated',
      'authenticated'
    )
    RETURNING id INTO super_admin_id;

    -- Insert into profiles
    INSERT INTO profiles (
      id,
      name,
      role
    ) VALUES (
      super_admin_id,
      'Super Admin',
      'super_admin'
    );
  END IF;
END $$;