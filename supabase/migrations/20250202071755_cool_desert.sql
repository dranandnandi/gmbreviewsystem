/*
  # Add sequence status to reviews

  1. Changes
    - Add has_sequence column to reviews table
    - Add default value of false
    - Make column not nullable
    
  2. Security
    - No changes to RLS policies needed as the column is part of the reviews table
*/

-- Add has_sequence column to reviews table
ALTER TABLE reviews 
ADD COLUMN IF NOT EXISTS has_sequence boolean NOT NULL DEFAULT false;