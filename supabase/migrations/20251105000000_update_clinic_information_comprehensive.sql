-- Update clinic_information table to match comprehensive schema
-- Drop existing table if needed (be careful in production!)
-- DROP TABLE IF EXISTS clinic_information CASCADE;

-- Create comprehensive clinic_information table
CREATE TABLE IF NOT EXISTS public.clinic_information (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  clinic_name CHARACTER VARYING(255) NOT NULL,
  clinic_address TEXT NULL,
  clinic_phone CHARACTER VARYING(20) NULL,
  clinic_email CHARACTER VARYING(255) NULL,
  clinic_website CHARACTER VARYING(255) NULL,
  gmb_link TEXT NULL,
  logo_url TEXT NULL,
  primary_color CHARACTER VARYING(7) NULL DEFAULT '#10B981',
  secondary_color CHARACTER VARYING(7) NULL DEFAULT '#6366F1',
  business_hours JSONB NULL DEFAULT '{}'::jsonb,
  specializations TEXT[] NULL,
  description TEXT NULL,
  
  -- Extended fields for comprehensive form
  tagline TEXT NULL,
  affiliations TEXT NULL,
  languages TEXT[] DEFAULT '{}',
  main_phone CHARACTER VARYING(20) NULL,
  emergency_phone CHARACTER VARYING(20) NULL,
  whatsapp_number CHARACTER VARYING(20) NULL,
  social_links JSONB DEFAULT '{}',
  clinic_display_name CHARACTER VARYING(255) NULL,
  full_address TEXT NULL,
  city CHARACTER VARYING(100) NULL,
  state CHARACTER VARYING(100) NULL,
  pincode CHARACTER VARYING(10) NULL,
  map_link TEXT NULL,
  timings JSONB DEFAULT '{}',
  parking_details TEXT NULL,
  treatments TEXT NULL,
  health_packages JSONB DEFAULT '[]',
  doctors JSONB DEFAULT '[]',
  clinic_message TEXT NULL,
  blog_link CHARACTER VARYING(500) NULL,
  youtube_channel CHARACTER VARYING(500) NULL,
  articles TEXT NULL,
  images JSONB DEFAULT '{}',
  awards TEXT NULL,
  memberships TEXT NULL,
  special_facilities TEXT NULL,
  is_draft BOOLEAN DEFAULT TRUE,
  
  created_at TIMESTAMP WITH TIME ZONE NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NULL DEFAULT NOW(),
  
  CONSTRAINT clinic_information_pkey PRIMARY KEY (id),
  CONSTRAINT unique_clinic_per_user UNIQUE (user_id),
  CONSTRAINT clinic_information_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users (id) ON DELETE CASCADE
) TABLESPACE pg_default;

-- Create index
CREATE INDEX IF NOT EXISTS idx_clinic_information_user_id 
ON public.clinic_information USING btree (user_id) TABLESPACE pg_default;

-- Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger
DROP TRIGGER IF EXISTS update_clinic_information_updated_at ON clinic_information;
CREATE TRIGGER update_clinic_information_updated_at 
    BEFORE UPDATE ON clinic_information 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE clinic_information ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
DROP POLICY IF EXISTS "Users can view their own clinic information" ON clinic_information;
CREATE POLICY "Users can view their own clinic information" ON clinic_information
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own clinic information" ON clinic_information;
CREATE POLICY "Users can insert their own clinic information" ON clinic_information
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own clinic information" ON clinic_information;
CREATE POLICY "Users can update their own clinic information" ON clinic_information
    FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own clinic information" ON clinic_information;
CREATE POLICY "Users can delete their own clinic information" ON clinic_information
    FOR DELETE USING (auth.uid() = user_id);