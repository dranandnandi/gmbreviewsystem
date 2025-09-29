/*
  # Add patient address to appointments table

  1. Changes
    - Add patient_address column to appointments table
    - Make it required for new appointments
    - Add default empty string for existing records
*/

-- Add patient_address column to appointments table
ALTER TABLE appointments 
ADD COLUMN IF NOT EXISTS patient_address text NOT NULL DEFAULT '';

-- Remove the default constraint after adding it
ALTER TABLE appointments 
ALTER COLUMN patient_address DROP DEFAULT;