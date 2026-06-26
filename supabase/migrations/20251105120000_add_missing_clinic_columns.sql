-- Add missing columns to clinic_information table to match the comprehensive form
-- This migration safely adds columns that don't exist yet

-- Basic Details
ALTER TABLE public.clinic_information
ADD COLUMN IF NOT EXISTS tagline TEXT NULL;

ALTER TABLE public.clinic_information
ADD COLUMN IF NOT EXISTS specialty CHARACTER VARYING(100) NULL;

ALTER TABLE public.clinic_information
ADD COLUMN IF NOT EXISTS affiliations TEXT NULL;

ALTER TABLE public.clinic_information
ADD COLUMN IF NOT EXISTS languages TEXT[] DEFAULT '{}';

-- Contact & Online Presence
ALTER TABLE public.clinic_information
ADD COLUMN IF NOT EXISTS main_phone CHARACTER VARYING(20) NULL;

ALTER TABLE public.clinic_information
ADD COLUMN IF NOT EXISTS emergency_phone CHARACTER VARYING(20) NULL;

ALTER TABLE public.clinic_information
ADD COLUMN IF NOT EXISTS whatsapp_number CHARACTER VARYING(20) NULL;

ALTER TABLE public.clinic_information
ADD COLUMN IF NOT EXISTS contact_email CHARACTER VARYING(255) NULL;

ALTER TABLE public.clinic_information
ADD COLUMN IF NOT EXISTS website_url CHARACTER VARYING(500) NULL;

ALTER TABLE public.clinic_information
ADD COLUMN IF NOT EXISTS social_links JSONB DEFAULT '{"facebook":"","instagram":"","linkedin":"","twitter":""}';

-- Location
ALTER TABLE public.clinic_information
ADD COLUMN IF NOT EXISTS clinic_display_name CHARACTER VARYING(255) NULL;

ALTER TABLE public.clinic_information
ADD COLUMN IF NOT EXISTS full_address TEXT NULL;

ALTER TABLE public.clinic_information
ADD COLUMN IF NOT EXISTS city CHARACTER VARYING(100) NULL;

ALTER TABLE public.clinic_information
ADD COLUMN IF NOT EXISTS state CHARACTER VARYING(100) NULL;

ALTER TABLE public.clinic_information
ADD COLUMN IF NOT EXISTS pincode CHARACTER VARYING(10) NULL;

ALTER TABLE public.clinic_information
ADD COLUMN IF NOT EXISTS map_link TEXT NULL;

ALTER TABLE public.clinic_information
ADD COLUMN IF NOT EXISTS timings JSONB DEFAULT '{"morning":"","evening":"","sunday":""}';

ALTER TABLE public.clinic_information
ADD COLUMN IF NOT EXISTS parking_details TEXT NULL;

-- Services
ALTER TABLE public.clinic_information
ADD COLUMN IF NOT EXISTS treatments TEXT NULL;

ALTER TABLE public.clinic_information
ADD COLUMN IF NOT EXISTS health_packages JSONB DEFAULT '[]';

ALTER TABLE public.clinic_information
ADD COLUMN IF NOT EXISTS doctors JSONB DEFAULT '[]';

-- Content
ALTER TABLE public.clinic_information
ADD COLUMN IF NOT EXISTS clinic_message TEXT NULL;

ALTER TABLE public.clinic_information
ADD COLUMN IF NOT EXISTS blog_link CHARACTER VARYING(500) NULL;

ALTER TABLE public.clinic_information
ADD COLUMN IF NOT EXISTS youtube_channel CHARACTER VARYING(500) NULL;

ALTER TABLE public.clinic_information
ADD COLUMN IF NOT EXISTS articles TEXT NULL;

-- Media & Additional
ALTER TABLE public.clinic_information
ADD COLUMN IF NOT EXISTS images JSONB DEFAULT '{"exterior":[],"reception":[],"consultation":[],"treatment":[],"equipment":[],"certificates":[]}';

ALTER TABLE public.clinic_information
ADD COLUMN IF NOT EXISTS awards TEXT NULL;

ALTER TABLE public.clinic_information
ADD COLUMN IF NOT EXISTS memberships TEXT NULL;

ALTER TABLE public.clinic_information
ADD COLUMN IF NOT EXISTS special_facilities TEXT NULL;

ALTER TABLE public.clinic_information
ADD COLUMN IF NOT EXISTS is_draft BOOLEAN DEFAULT TRUE;

-- Add comments for documentation
COMMENT ON COLUMN public.clinic_information.tagline IS 'Clinic tagline or slogan';
COMMENT ON COLUMN public.clinic_information.specialty IS 'Primary medical specialty';
COMMENT ON COLUMN public.clinic_information.affiliations IS 'Hospital affiliations and partnerships';
COMMENT ON COLUMN public.clinic_information.languages IS 'Languages spoken at the clinic';
COMMENT ON COLUMN public.clinic_information.main_phone IS 'Main contact number for appointments';
COMMENT ON COLUMN public.clinic_information.emergency_phone IS 'Emergency contact number';
COMMENT ON COLUMN public.clinic_information.whatsapp_number IS 'WhatsApp business number';
COMMENT ON COLUMN public.clinic_information.contact_email IS 'Primary contact email';
COMMENT ON COLUMN public.clinic_information.website_url IS 'Clinic website URL';
COMMENT ON COLUMN public.clinic_information.social_links IS 'Social media links (facebook, instagram, linkedin, twitter)';
COMMENT ON COLUMN public.clinic_information.clinic_display_name IS 'Display name for maps and directories';
COMMENT ON COLUMN public.clinic_information.full_address IS 'Complete street address';
COMMENT ON COLUMN public.clinic_information.city IS 'City name';
COMMENT ON COLUMN public.clinic_information.state IS 'State or province';
COMMENT ON COLUMN public.clinic_information.pincode IS 'Postal code';
COMMENT ON COLUMN public.clinic_information.map_link IS 'Google Maps link';
COMMENT ON COLUMN public.clinic_information.timings IS 'Operating hours (morning, evening, sunday)';
COMMENT ON COLUMN public.clinic_information.parking_details IS 'Parking availability and information';
COMMENT ON COLUMN public.clinic_information.treatments IS 'List of treatments and services offered';
COMMENT ON COLUMN public.clinic_information.health_packages IS 'Array of health package objects';
COMMENT ON COLUMN public.clinic_information.doctors IS 'Array of doctor information objects';
COMMENT ON COLUMN public.clinic_information.clinic_message IS 'About clinic message';
COMMENT ON COLUMN public.clinic_information.blog_link IS 'Link to clinic blog';
COMMENT ON COLUMN public.clinic_information.youtube_channel IS 'YouTube channel URL';
COMMENT ON COLUMN public.clinic_information.articles IS 'Articles and publications';
COMMENT ON COLUMN public.clinic_information.images IS 'Categorized image URLs';
COMMENT ON COLUMN public.clinic_information.awards IS 'Awards and recognition';
COMMENT ON COLUMN public.clinic_information.memberships IS 'Professional memberships';
COMMENT ON COLUMN public.clinic_information.special_facilities IS 'Special facilities and equipment';
COMMENT ON COLUMN public.clinic_information.is_draft IS 'Whether the form is saved as draft';

-- Create indexes for frequently queried columns
CREATE INDEX IF NOT EXISTS idx_clinic_information_city ON public.clinic_information(city);
CREATE INDEX IF NOT EXISTS idx_clinic_information_state ON public.clinic_information(state);
CREATE INDEX IF NOT EXISTS idx_clinic_information_specialty ON public.clinic_information(specialty);
CREATE INDEX IF NOT EXISTS idx_clinic_information_is_draft ON public.clinic_information(is_draft);

-- Ensure RLS policies are still working correctly
-- Refresh RLS policies to make sure they work with new columns
ALTER TABLE public.clinic_information DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinic_information ENABLE ROW LEVEL SECURITY;