-- Account creation is now handled by the create-micro-saas-account Edge Function.
-- Older databases may still have auth.users triggers from early onboarding flows.
-- Those triggers can make Supabase Auth fail with "Database error creating new user"
-- before the Edge Function can insert the real public.users profile.

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

DROP TRIGGER IF EXISTS trigger_sync_user_to_neon ON auth.users;
DROP FUNCTION IF EXISTS public.sync_user_to_neon();
