/*
  # Add language support to sequence templates

  1. Changes
    - Add language column to sequence_templates table
    - Update existing templates to set English as default language
    - Add index for efficient language-based queries

  2. Notes
    - Existing templates are marked as English
    - Language code follows ISO 639-1 standard (en, hi, gu, mr)
*/

-- Add language column to sequence_templates
ALTER TABLE sequence_templates
ADD COLUMN language text NOT NULL DEFAULT 'en';

-- Create index for efficient language queries
CREATE INDEX sequence_templates_language_idx ON sequence_templates(language);

-- Remove the default constraint after adding it
ALTER TABLE sequence_templates
ALTER COLUMN language DROP DEFAULT;