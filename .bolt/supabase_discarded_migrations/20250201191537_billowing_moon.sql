/*
  # Drop RLS policies for reviews table

  1. Changes
    - Drop all RLS policies from reviews table
    - Keep RLS enabled on the table
*/

-- Drop existing policies for reviews table
DROP POLICY IF EXISTS "Users can view reviews for their clinic" ON reviews;
DROP POLICY IF EXISTS "Users can insert reviews for their clinic" ON reviews;
DROP POLICY IF EXISTS "Users can update reviews in their clinic" ON reviews;