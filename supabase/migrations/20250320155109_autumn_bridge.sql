/*
  # Update creatives table schema for better date filtering

  1. Changes
    - Add separate month and year columns
    - Update existing records
    - Add combined index for efficient filtering
    - Add check constraints for valid values

  2. Security
    - No changes to RLS policies needed
*/

-- Add new columns for month and year
ALTER TABLE creatives
ADD COLUMN year integer,
ADD COLUMN month_number integer;

-- Update the new columns based on the existing month column
UPDATE creatives
SET 
  year = EXTRACT(YEAR FROM month),
  month_number = EXTRACT(MONTH FROM month);

-- Add check constraints
ALTER TABLE creatives
ADD CONSTRAINT creatives_year_check CHECK (year >= 2020 AND year <= 2030),
ADD CONSTRAINT creatives_month_number_check CHECK (month_number >= 1 AND month_number <= 12);

-- Make the new columns not nullable
ALTER TABLE creatives
ALTER COLUMN year SET NOT NULL,
ALTER COLUMN month_number SET NOT NULL;

-- Create index for efficient filtering
CREATE INDEX creatives_user_year_month_idx ON creatives(user_id, year, month_number);

-- Update the sample creative to use the new columns
UPDATE creatives
SET 
  year = 2025,
  month_number = 3
WHERE user_id IN (
  SELECT id FROM users WHERE contact_email = 'swastikcdckarwar@gmail.com'
);