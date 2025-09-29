/*
  # Add AI review text to reviews table

  1. Changes
    - Add ai_review_text column to reviews table
    - This will store the AI-generated review content to prevent redundant AI calls

  2. Security
    - No changes to RLS policies needed as this is just adding a column to existing table
*/

-- Add ai_review_text column to reviews table
ALTER TABLE reviews 
ADD COLUMN IF NOT EXISTS ai_review_text text;

-- Add comment for documentation
COMMENT ON COLUMN reviews.ai_review_text IS 'Stores AI-generated review text to prevent redundant API calls';