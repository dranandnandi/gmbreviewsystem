/*
  # Add doctor_id column to appointments table
  
  1. Changes
    - Add doctor_id column as a foreign key reference to doctors table
    - Make it nullable since some appointments might not have a doctor assigned yet
*/

-- Add doctor_id column with foreign key constraint
ALTER TABLE appointments 
ADD COLUMN IF NOT EXISTS doctor_id uuid REFERENCES doctors(id);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS appointments_doctor_id_idx ON appointments(doctor_id);