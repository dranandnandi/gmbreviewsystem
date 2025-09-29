/*
  # Remove doctor references from reviews and appointments tables

  1. Changes
    - Remove doctor_id column from reviews table
    - Remove doctor_id column from appointments table

  2. Security
    - Preserve existing RLS policies
*/

-- Remove doctor_id from reviews
ALTER TABLE reviews
DROP COLUMN IF EXISTS doctor_id;

-- Remove doctor_id from appointments
ALTER TABLE appointments
DROP COLUMN IF EXISTS doctor_id;