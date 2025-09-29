/*
  # Add Blueticks API Key to Users Table

  1. Changes
    - Add blueticks_api_key column to users table
    - Make it nullable since existing users won't have this configured initially

  2. Security
    - No changes to RLS policies needed as this is just adding a column to existing table
*/

-- Add blueticks_api_key column to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS blueticks_api_key text;

-- Add comment for documentation
COMMENT ON COLUMN users.blueticks_api_key IS 'Blueticks API key for direct WhatsApp messaging integration';