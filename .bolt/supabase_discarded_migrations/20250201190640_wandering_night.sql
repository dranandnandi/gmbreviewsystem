/*
  # Add RLS policies for reviews table

  1. Changes
    - Add RLS policies for reviews table to allow authenticated users to:
      - View reviews for their clinic
      - Insert reviews for their clinic
      - Update reviews in their clinic

  2. Security
    - Enable RLS on reviews table
    - Add policies based on clinic_id matching user's clinic
*/

-- Enable RLS for reviews table
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

-- Create policies for reviews table
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