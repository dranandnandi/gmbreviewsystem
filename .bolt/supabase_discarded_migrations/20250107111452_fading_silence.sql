/*
  # Set up initial profiles and clinic settings

  1. Changes
    - Create profiles for existing users
    - Set up initial clinic settings with a fixed UUID
    - Remove the single_row constraint and use a different approach
*/

-- First, remove the problematic constraint if it exists
ALTER TABLE IF EXISTS public.clinic_settings 
DROP CONSTRAINT IF EXISTS single_row;

-- Add a new type column to ensure only one active record
ALTER TABLE IF EXISTS public.clinic_settings 
ADD COLUMN IF NOT EXISTS type text DEFAULT 'primary';

-- Add a unique constraint on the type column
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'clinic_settings_type_key'
  ) THEN
    ALTER TABLE public.clinic_settings
    ADD CONSTRAINT clinic_settings_type_key UNIQUE (type);
  END IF;
END $$;

-- Create profiles for users
INSERT INTO public.profiles (id, name, role)
SELECT 
  id,
  CASE 
    WHEN email LIKE 'admin%' THEN 'Admin ' || substring(email from 'admin(\d+)@')
    ELSE 'Receptionist ' || substring(email from 'receptionist(\d+)@')
  END,
  CASE 
    WHEN email LIKE 'admin%' THEN 'admin'
    ELSE 'receptionist'
  END
FROM auth.users u
WHERE NOT EXISTS (
  SELECT 1 FROM public.profiles p WHERE p.id = u.id
)
AND email IN (
  'admin1@clinic.com',
  'admin2@clinic.com',
  'receptionist1@clinic.com',
  'receptionist2@clinic.com',
  'receptionist3@clinic.com'
);

-- Set default clinic settings
INSERT INTO public.clinic_settings (name, address, gmb_link, type)
VALUES (
  'Sample Clinic',
  '123 Main St, City',
  'https://g.page/your-clinic',
  'primary'
)
ON CONFLICT (type) DO UPDATE 
SET 
  name = EXCLUDED.name,
  address = EXCLUDED.address,
  gmb_link = EXCLUDED.gmb_link;