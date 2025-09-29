-- Update existing users to have aud = 'authenticated'
UPDATE auth.users
SET aud = 'authenticated'
WHERE aud IS NULL OR aud != 'authenticated';

-- Set default value for aud column
ALTER TABLE auth.users 
ALTER COLUMN aud SET DEFAULT 'authenticated';

-- Ensure aud is not null
ALTER TABLE auth.users 
ALTER COLUMN aud SET NOT NULL;