/*
  # Add optional letterhead URL for smart report branding

  Stores the lab letterhead/branding asset uploaded with a report request.
  The smart report Edge Function can use this asset as a full A4 background
  for the first and last pages before merging with the generated report body.
*/

ALTER TABLE IF EXISTS public.report_requests
ADD COLUMN IF NOT EXISTS letterhead_url text;

COMMENT ON COLUMN public.report_requests.letterhead_url IS
'Optional public URL for the report letterhead/branding asset used on first and last smart report pages.';

