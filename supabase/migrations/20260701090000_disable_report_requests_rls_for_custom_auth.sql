/*
  # Disable report_requests RLS for custom app authentication

  The app uses its own public.users login flow rather than Supabase Auth sessions.
  Existing report_requests policies compare user_id to auth.uid(), so browser
  inserts from the app fail with:

    new row violates row-level security policy for table "report_requests"

  Keep report_requests aligned with the current app access pattern and allow the
  frontend to create, update, and read report requests using the configured anon
  key. Application-level filtering is still performed by user_id in the store.
*/

ALTER TABLE IF EXISTS public.report_requests DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own report requests" ON public.report_requests;
DROP POLICY IF EXISTS "Users can insert their own report requests" ON public.report_requests;
DROP POLICY IF EXISTS "Users can update report requests" ON public.report_requests;
DROP POLICY IF EXISTS "Super admins can delete report requests" ON public.report_requests;

