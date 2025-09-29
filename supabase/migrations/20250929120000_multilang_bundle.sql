-- Add language and localized bundle columns to reviews
-- Safe to run multiple times if columns already exist (guards included)

DO $$
BEGIN
  -- language column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'reviews' AND column_name = 'language'
  ) THEN
    ALTER TABLE public.reviews
      ADD COLUMN language text NOT NULL DEFAULT 'en';
    COMMENT ON COLUMN public.reviews.language IS 'Selected language for messages (ISO code, e.g., en, hi, gu)';
  END IF;

  -- localized_message_bundle column (stores 1 or 3 messages and metadata)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'reviews' AND column_name = 'localized_message_bundle'
  ) THEN
    ALTER TABLE public.reviews
      ADD COLUMN localized_message_bundle jsonb;
    COMMENT ON COLUMN public.reviews.localized_message_bundle IS 'JSON bundle of messages generated for a non-English flow: {language, flow, messages: string[], model, terms_kept, created_at}';
  END IF;

  -- localized_message_bundle_status column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'reviews' AND column_name = 'localized_message_bundle_status'
  ) THEN
    ALTER TABLE public.reviews
      ADD COLUMN localized_message_bundle_status text CHECK (localized_message_bundle_status IN ('prepared','consumed'));
    COMMENT ON COLUMN public.reviews.localized_message_bundle_status IS 'prepared | consumed, tracks bundle usage';
  END IF;
END $$;
