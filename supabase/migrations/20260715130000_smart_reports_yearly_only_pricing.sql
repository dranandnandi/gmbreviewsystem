-- Smart Reports is sold yearly-only at Rs 2,999/year.
-- monthly_price = 0 means the monthly cycle is not offered (UI hides it,
-- and the checkout functions reject amount <= 0 server-side).
UPDATE public.saas_plans
SET monthly_price = 0,
    yearly_price = 2999,
    updated_at = now()
WHERE id = 'smart_reports';
