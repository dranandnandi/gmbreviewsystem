/*
  # Add patient WhatsApp number to report requests

  1. Changes
    - Add patient_whatsapp_number column to report_requests table
    - Make it nullable since it's optional
    - Add validation for 10-digit phone numbers

  2. Security
    - No changes to RLS policies needed as this is just adding a column
*/

-- Add patient_whatsapp_number column to report_requests table
DO $$ 
BEGIN
  -- Check if column doesn't exist before adding it
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'report_requests' 
    AND column_name = 'patient_whatsapp_number'
  ) THEN
    ALTER TABLE report_requests 
    ADD COLUMN patient_whatsapp_number text;
    
    -- Add check constraint for valid phone number format (optional)
    ALTER TABLE report_requests 
    ADD CONSTRAINT report_requests_patient_whatsapp_check 
    CHECK (patient_whatsapp_number IS NULL OR patient_whatsapp_number ~ '^[0-9]{10}$');
  END IF;
END $$;

-- Add comment for documentation
COMMENT ON COLUMN report_requests.patient_whatsapp_number IS 'Optional WhatsApp number for sending reports directly to patient (10 digits)';