/*
  # Add merged report URL column to report requests

  1. Changes
    - Add merged_report_url column to report_requests table
    - Column stores URL of merged PDF file for each report request
    - Make column nullable since existing reports won't have merged PDFs

  2. Security
    - No changes to RLS policies needed as this is just adding a column
*/

-- Add merged_report_url column to report_requests table
DO $$ 
BEGIN
  -- Check if column doesn't exist before adding it
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'report_requests' 
    AND column_name = 'merged_report_url'
  ) THEN
    ALTER TABLE report_requests 
    ADD COLUMN merged_report_url text;
  END IF;
END $$;

-- Add comment for documentation
COMMENT ON COLUMN report_requests.merged_report_url IS 'URL of the merged PDF file combining all uploaded reports for this request';