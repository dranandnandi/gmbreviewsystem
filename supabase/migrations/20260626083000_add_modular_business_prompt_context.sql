-- Add optional modular prompt context for non-clinic use cases.
-- Null keeps the existing clinic/patient/appointment wording intact.

ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS business_context jsonb;

COMMENT ON COLUMN public.users.business_context IS
  'Optional JSON prompt context for modular SaaS use cases. Example: {"businessType":"Diagnostic lab","customerLabel":"patient","appointmentLabel":"home visit","locationLabel":"home","serviceKeywords":"CBC, lipid profile","promptNotes":"Mention sample collection, avoid doctor language"}';
