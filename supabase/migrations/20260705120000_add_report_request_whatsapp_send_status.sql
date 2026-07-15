-- Track WhatsApp delivery state for Smart Report requests.

ALTER TABLE IF EXISTS public.report_requests
ADD COLUMN IF NOT EXISTS whatsapp_send_status text NOT NULL DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS whatsapp_sent_at timestamptz,
ADD COLUMN IF NOT EXISTS whatsapp_send_error text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'report_requests_whatsapp_send_status_check'
  ) THEN
    ALTER TABLE public.report_requests
    ADD CONSTRAINT report_requests_whatsapp_send_status_check
    CHECK (whatsapp_send_status IN ('pending', 'sent', 'failed'));
  END IF;
END $$;

COMMENT ON COLUMN public.report_requests.whatsapp_send_status IS
  'Delivery state for direct WhatsApp sending of completed Smart Reports.';

COMMENT ON COLUMN public.report_requests.whatsapp_sent_at IS
  'Timestamp when the Smart Report was sent directly over WhatsApp.';

COMMENT ON COLUMN public.report_requests.whatsapp_send_error IS
  'Last direct WhatsApp send failure message for this Smart Report request.';
