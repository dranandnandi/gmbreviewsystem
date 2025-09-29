/*
  # Add RLS policies for reviews table

  1. Changes
    - Add RLS policies for reviews table to allow authenticated users to:
      - View reviews for their clinic
      - Insert reviews for their clinic
      - Update reviews in their clinic

  2. Security
    - Preserve existing RLS policies
    - Add new policies based on clinic_id matching user's clinic
*/

-- Create policies for reviews table if they don't exist
DO $$ 
BEGIN
  -- Policy for viewing reviews
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'reviews' 
    AND policyname = 'Users can view reviews for their clinic'
  ) THEN
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
  END IF;

  -- Policy for inserting reviews
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'reviews' 
    AND policyname = 'Users can insert reviews for their clinic'
  ) THEN
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
  END IF;

  -- Policy for updating reviews
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'reviews' 
    AND policyname = 'Users can update reviews in their clinic'
  ) THEN
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
  END IF;
END $$;