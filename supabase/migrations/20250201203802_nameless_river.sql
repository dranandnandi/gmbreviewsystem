/*
  # Fix Reviews RLS Policies

  1. Changes
    - Drop existing reviews policies
    - Create new policies for reviews table that properly handle user_id
    - Add policies for insert, update, and delete operations

  2. Security
    - Enable RLS on reviews table
    - Ensure users can only access their own reviews
    - Allow authenticated users to manage their own reviews
*/

-- Drop existing policies for reviews
DROP POLICY IF EXISTS "Users can view their own reviews" ON reviews;
DROP POLICY IF EXISTS "Users can manage their own reviews" ON reviews;

-- Create new policies for reviews
CREATE POLICY "Users can view their own reviews"
  ON reviews
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own reviews"
  ON reviews
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own reviews"
  ON reviews
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own reviews"
  ON reviews
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());