/*
  # Add 'sent_to_sheet' status to sequence messages

  1. Changes
    - Update the status check constraint to include 'sent_to_sheet'
    - This allows messages to be marked as sent to Google Sheets

  2. Security
    - No changes to RLS policies needed
*/

-- Drop the existing constraint
ALTER TABLE sequence_messages 
DROP CONSTRAINT IF EXISTS sequence_messages_status_check;

-- Add the new constraint with 'sent_to_sheet' status
ALTER TABLE sequence_messages 
ADD CONSTRAINT sequence_messages_status_check 
CHECK (status IN ('pending', 'sent', 'failed', 'sent_to_sheet'));