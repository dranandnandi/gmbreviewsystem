/*
  # Add doctor fields to appointments table
  
  1. Changes
    - Add doctor_name and doctor_contact columns to appointments table
    - Make them non-nullable with default values
*/

-- Add new columns
ALTER TABLE appointments 
ADD COLUMN IF NOT EXISTS doctor_name text NOT NULL DEFAULT 'Not assigned',
ADD COLUMN IF NOT EXISTS doctor_contact text NOT NULL DEFAULT 'Not available';

-- Remove default constraints after adding them
ALTER TABLE appointments 
ALTER COLUMN doctor_name DROP DEFAULT,
ALTER COLUMN doctor_contact DROP DEFAULT;