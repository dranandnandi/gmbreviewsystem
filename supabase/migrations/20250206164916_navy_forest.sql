/*
  # Fix sequence templates language support

  1. Changes
    - Add language column if not exists
    - Update unique constraints to support language-specific templates
    - Handle existing constraint gracefully
*/

-- Add language column to sequence_templates if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_name = 'sequence_templates' AND column_name = 'language'
  ) THEN
    ALTER TABLE sequence_templates
    ADD COLUMN language text NOT NULL DEFAULT 'en';

    -- Create index for efficient language queries
    CREATE INDEX sequence_templates_language_idx ON sequence_templates(language);

    -- Remove the default constraint after adding it
    ALTER TABLE sequence_templates
    ALTER COLUMN language DROP DEFAULT;
  END IF;
END $$;

-- Handle unique constraints in a separate transaction
DO $$
BEGIN
  -- Drop old constraint if it exists
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'sequence_templates_profile_type_sequence_order_key'
  ) THEN
    ALTER TABLE sequence_templates
    DROP CONSTRAINT sequence_templates_profile_type_sequence_order_key;
  END IF;

  -- Add new composite unique constraint if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'sequence_templates_profile_type_sequence_order_language_key'
  ) THEN
    ALTER TABLE sequence_templates
    ADD CONSTRAINT sequence_templates_profile_type_sequence_order_language_key 
    UNIQUE (profile_type, sequence_order, language);
  END IF;
END $$;