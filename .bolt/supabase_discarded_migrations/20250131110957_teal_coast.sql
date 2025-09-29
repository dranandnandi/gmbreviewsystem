/*
  # Add language and contact settings

  1. New Columns
    - `clinic_settings` table:
      - `contact_phone` (text) - Primary contact number
      - `contact_email` (text) - Contact email
      - `contact_whatsapp` (text) - WhatsApp number
      - `languages` (jsonb) - Supported languages and translations
      - `default_language` (text) - Default language code

  2. Security
    - Update RLS policies to include new columns
*/

-- Add new columns to clinic_settings
ALTER TABLE clinic_settings 
ADD COLUMN IF NOT EXISTS contact_phone text,
ADD COLUMN IF NOT EXISTS contact_email text,
ADD COLUMN IF NOT EXISTS contact_whatsapp text,
ADD COLUMN IF NOT EXISTS languages jsonb DEFAULT '{"en": {"name": "", "address": ""}}',
ADD COLUMN IF NOT EXISTS default_language text DEFAULT 'en';

-- Add check constraint for default_language
ALTER TABLE clinic_settings
ADD CONSTRAINT valid_default_language CHECK (default_language IN ('en', 'hi', 'gu', 'mr'));