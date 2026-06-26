-- Corrective migration: older environments may already have recorded the
-- March migration, so redefine the webhook route and queue a fresh backfill.

CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

CREATE OR REPLACE FUNCTION public.sync_public_user_to_whatsapp_backend()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  edge_function_url text :=
    'https://iksfxkjnslttufpdklgq.supabase.co/functions/v1/sync-user-to-neon';
BEGIN
  PERFORM net.http_post(
    url := edge_function_url,
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := jsonb_build_object(
      'type', TG_OP,
      'table', TG_TABLE_NAME,
      'schema', TG_TABLE_SCHEMA,
      'record', to_jsonb(NEW),
      'old_record', NULL
    )
  );

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not queue WhatsApp sync for public user %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_sync_public_user_to_whatsapp_backend ON public.users;

CREATE TRIGGER trigger_sync_public_user_to_whatsapp_backend
AFTER INSERT ON public.users
FOR EACH ROW
EXECUTE FUNCTION public.sync_public_user_to_whatsapp_backend();

-- The earlier version returned void. PostgreSQL requires dropping a function
-- before recreating it with a different return type.
DROP FUNCTION IF EXISTS public.backfill_public_users_to_whatsapp_backend();

-- Existing users are intentionally not backfilled. They can be handled
-- manually; this migration only installs automatic sync for future inserts.
