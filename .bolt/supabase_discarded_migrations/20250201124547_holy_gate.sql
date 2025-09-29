/*
  # Update doctors table structure for phlebotomists

  1. Changes
    - First create new column to avoid data loss
    - Copy data from specialization to new column
    - Drop old column
    - Add constraints
*/

-- Add new contact_number column
ALTER TABLE doctors 
ADD COLUMN contact_number text;

-- Copy data from specialization to contact_number
UPDATE doctors 
SET contact_number = specialization;

-- Drop old specialization column
ALTER TABLE doctors 
DROP COLUMN specialization;

-- Add check constraint for contact number format
ALTER TABLE doctors 
ADD CONSTRAINT valid_contact_number 
CHECK (contact_number ~ '^[0-9]{10}$');

-- Make contact_number required
ALTER TABLE doctors 
ALTER COLUMN contact_number SET NOT NULL;