/*
  # Add ai_review_first_message_sent column to reviews table

  1. Changes
    - Add `ai_review_first_message_sent` column to `reviews` table
    - Set default value to `false` for existing records
    - Column tracks whether the first AI-powered message has been sent to the patient

  2. Security
    - No changes to RLS policies needed as this is just adding a column to existing table
*/

-- Add the missing column to the reviews table
ALTER TABLE public.reviews 
ADD COLUMN IF NOT EXISTS ai_review_first_message_sent BOOLEAN DEFAULT FALSE;

-- Update existing records to have the default value
UPDATE public.reviews 
SET ai_review_first_message_sent = FALSE 
WHERE ai_review_first_message_sent IS NULL;