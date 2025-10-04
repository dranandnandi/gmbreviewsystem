-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.appointments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  patient_name text NOT NULL,
  appointment_date date NOT NULL,
  appointment_time time without time zone NOT NULL,
  contact_number text NOT NULL,
  notes text,
  status text NOT NULL DEFAULT 'pending'::text CHECK (status = ANY (ARRAY['pending'::text, 'completed'::text, 'cancelled'::text])),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  patient_address text NOT NULL,
  doctor_name text NOT NULL,
  doctor_contact text NOT NULL,
  doctor_id uuid,
  CONSTRAINT appointments_pkey PRIMARY KEY (id),
  CONSTRAINT appointments_doctor_id_fkey FOREIGN KEY (doctor_id) REFERENCES public.doctors(id),
  CONSTRAINT appointments_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.creative_categories (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT creative_categories_pkey PRIMARY KEY (id)
);
CREATE TABLE public.creatives (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  category_id uuid NOT NULL,
  title text NOT NULL,
  description text,
  content_type text NOT NULL CHECK (content_type = ANY (ARRAY['image'::text, 'video'::text, 'iframe'::text, 'link'::text])),
  content text NOT NULL,
  thumbnail_url text,
  month date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  year integer NOT NULL CHECK (year >= 2020 AND year <= 2030),
  month_number integer NOT NULL CHECK (month_number >= 1 AND month_number <= 12),
  CONSTRAINT creatives_pkey PRIMARY KEY (id),
  CONSTRAINT creatives_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.creative_categories(id),
  CONSTRAINT creatives_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.doctors (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  contact_number text NOT NULL CHECK (contact_number ~ '^[0-9]{10}$'::text),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT doctors_pkey PRIMARY KEY (id),
  CONSTRAINT doctors_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.patient_profiles (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  patient_name text NOT NULL,
  contact_number text NOT NULL,
  whatsapp_number text NOT NULL,
  profile_type text NOT NULL,
  last_visit_date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT patient_profiles_pkey PRIMARY KEY (id),
  CONSTRAINT patient_profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.report_requests (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  patient_name text NOT NULL,
  request_date timestamp with time zone DEFAULT now(),
  report_type text NOT NULL CHECK (report_type = ANY (ARRAY['smart_report'::text, 'trend_analysis'::text, 'longitivity_report'::text])),
  summary_language text,
  status text NOT NULL DEFAULT 'pending'::text CHECK (status = ANY (ARRAY['pending'::text, 'processing'::text, 'completed'::text, 'failed'::text])),
  uploaded_report_urls jsonb,
  generated_report_url text,
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  merged_report_url text,
  patient_whatsapp_number text CHECK (patient_whatsapp_number IS NULL OR patient_whatsapp_number ~ '^[0-9]{10}$'::text),
  CONSTRAINT report_requests_pkey PRIMARY KEY (id),
  CONSTRAINT report_requests_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.review_request_templates (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  name text NOT NULL,
  template_type text NOT NULL CHECK (template_type = ANY (ARRAY['ai_integrated'::text, 'simple_thank_you'::text])),
  message_template text NOT NULL,
  description text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT review_request_templates_pkey PRIMARY KEY (id),
  CONSTRAINT review_request_templates_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.reviews (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  patient_name text NOT NULL,
  appointment_date date NOT NULL,
  contact_number text NOT NULL,
  treatment text,
  notes text,
  status text NOT NULL DEFAULT 'pending'::text CHECK (status = ANY (ARRAY['pending'::text, 'sent'::text])),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  has_sequence boolean NOT NULL DEFAULT false,
  ai_review_text text,
  ai_review_first_message_sent boolean DEFAULT false,
  CONSTRAINT reviews_pkey PRIMARY KEY (id),
  CONSTRAINT reviews_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.sequence_messages (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  profile_id uuid NOT NULL,
  patient_name text NOT NULL,
  whatsapp_number text NOT NULL,
  scheduled_date date NOT NULL,
  message_content text NOT NULL,
  status text NOT NULL CHECK (status = ANY (ARRAY['pending'::text, 'sent'::text, 'failed'::text, 'sent_to_sheet'::text])),
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT sequence_messages_pkey PRIMARY KEY (id),
  CONSTRAINT sequence_messages_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.sequence_templates (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  profile_type text NOT NULL,
  message_template text NOT NULL,
  sequence_days integer NOT NULL DEFAULT 15,
  sequence_order integer NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  language text NOT NULL,
  user_id uuid,
  target_profile_type text,
  CONSTRAINT sequence_templates_pkey PRIMARY KEY (id),
  CONSTRAINT sequence_templates_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.users (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  auth_id uuid,
  username text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  name text NOT NULL,
  role text NOT NULL CHECK (role = ANY (ARRAY['admin'::text, 'receptionist'::text, 'super_admin'::text])),
  clinic_name text NOT NULL,
  clinic_address text NOT NULL,
  gmb_link text,
  logo text,
  primary_color text DEFAULT '#4F46E5'::text,
  secondary_color text DEFAULT '#E5E7EB'::text,
  contact_phone text,
  contact_email text,
  contact_whatsapp text,
  languages jsonb DEFAULT '{"en": {"name": "", "address": ""}}'::jsonb,
  default_language text DEFAULT 'en'::text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  google_sheet_id text,
  google_apps_script_url text,
  enabled_features jsonb DEFAULT '["dashboard", "appointments", "reviews", "sequences", "creatives", "reports"]'::jsonb,
  blueticks_api_key text,
  profile_types jsonb DEFAULT '[]'::jsonb,
  CONSTRAINT users_pkey PRIMARY KEY (id),
  CONSTRAINT users_auth_id_fkey FOREIGN KEY (auth_id) REFERENCES auth.users(id)
);