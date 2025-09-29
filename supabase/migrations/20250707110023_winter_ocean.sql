/*
  # Remove profile type constraint to allow custom profile types

  1. Changes
    - Drop the existing CHECK constraint on profile_type column in sequence_templates table
    - This allows users to define custom profile types instead of being limited to predefined ones

  2. Security
    - No changes to RLS policies needed
    - Existing policies will continue to work with custom profile types
*/

-- Drop the existing constraint that limits profile_type to predefined values
ALTER TABLE sequence_templates 
DROP CONSTRAINT IF EXISTS sequence_templates_profile_type_check;

-- Also drop the constraint from patient_profiles table to be consistent
ALTER TABLE patient_profiles 
DROP CONSTRAINT IF EXISTS patient_profiles_profile_type_check;