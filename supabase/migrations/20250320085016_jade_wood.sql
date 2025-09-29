/*
  # Add initial phlebotomists

  1. Changes
    - Insert initial phlebotomist records for testing
    - Each phlebotomist has a name and contact number
    - Records are linked to the user's clinic

  2. Security
    - No changes to RLS policies needed
    - Uses existing doctors table structure
*/

-- Function to add initial phlebotomists if none exist
DO $$ 
DECLARE
  v_user_id uuid;
  v_count integer;
BEGIN
  -- Get the first user id (clinic)
  SELECT id INTO v_user_id FROM users LIMIT 1;
  
  -- Check if there are any existing doctors
  SELECT COUNT(*) INTO v_count FROM doctors;
  
  -- Only add initial doctors if none exist
  IF v_count = 0 AND v_user_id IS NOT NULL THEN
    INSERT INTO doctors (user_id, name, contact_number) VALUES
      (v_user_id, 'Dr. Rajesh Kumar', '9876543210'),
      (v_user_id, 'Dr. Priya Sharma', '9876543211'),
      (v_user_id, 'Dr. Amit Patel', '9876543212');
  END IF;
END $$;