-- First drop existing policies
DROP POLICY IF EXISTS "Users can only view their clinic's doctors" ON doctors;
DROP POLICY IF EXISTS "Users can only modify their clinic's doctors" ON doctors;

-- Add clinic_id to profiles
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS clinic_id uuid REFERENCES clinic_settings(id);

-- Add clinic_id to doctors
ALTER TABLE doctors 
ADD COLUMN IF NOT EXISTS clinic_id uuid REFERENCES clinic_settings(id);

-- Add clinic_id to appointments
ALTER TABLE appointments
ADD COLUMN IF NOT EXISTS clinic_id uuid REFERENCES clinic_settings(id);

-- Add clinic_id to reviews
ALTER TABLE reviews
ADD COLUMN IF NOT EXISTS clinic_id uuid REFERENCES clinic_settings(id);

-- Create new policies
DO $$ 
BEGIN
  -- Create policy for viewing doctors
  DROP POLICY IF EXISTS "Users can only view their clinic's doctors" ON doctors;
  CREATE POLICY "Users can only view their clinic's doctors"
    ON doctors FOR SELECT
    TO authenticated
    USING (clinic_id IN (
      SELECT clinic_id FROM profiles WHERE id = auth.uid()
    ));

  -- Create policy for modifying doctors
  DROP POLICY IF EXISTS "Users can only modify their clinic's doctors" ON doctors;
  CREATE POLICY "Users can only modify their clinic's doctors"
    ON doctors FOR ALL
    TO authenticated
    USING (clinic_id IN (
      SELECT clinic_id FROM profiles WHERE id = auth.uid()
    ));
END $$;