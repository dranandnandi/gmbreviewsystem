/*
  # Add Google Apps Script URL to users table

  1. Changes
    - Add google_apps_script_url column to users table
    - Make it nullable since existing users won't have this configured initially

  2. Security
    - No changes to RLS policies needed as this is just adding a column to existing table
*/

-- Add google_apps_script_url column to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS google_apps_script_url text;

-- Add comment for documentation
COMMENT ON COLUMN users.google_apps_script_url IS 'URL of the deployed Google Apps Script Web App for Google Sheets integration';