-- Add clinic_keywords column to users table for review generation
ALTER TABLE users ADD COLUMN IF NOT EXISTS clinic_keywords TEXT;

COMMENT ON COLUMN users.clinic_keywords IS 'JSON string array of keywords/services for review generation (e.g., ["MRI", "CBC", "X-ray", "CT Scan", "ECG"])';
