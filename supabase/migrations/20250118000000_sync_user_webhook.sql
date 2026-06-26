-- User synchronization is handled from public.users, where the application
-- user ID and clinic profile fields are available. Remove the obsolete auth
-- trigger if it exists so it cannot create duplicate or mismatched users.

DROP TRIGGER IF EXISTS trigger_sync_user_to_neon ON auth.users;
DROP FUNCTION IF EXISTS public.sync_user_to_neon();
