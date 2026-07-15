-- Harden CCAvenue payment processing
-- 1. Fix activate_subscription_on_payment(): users.enabled_features is jsonb, but the
--    trigger assigned a text[] (array_agg) — every successful payment would error out.
-- 2. Make activation idempotent: a replayed/duplicate CCAvenue callback must not
--    extend the subscription period again.
-- 3. Enforce at most one Success transaction per order at the DB level.
-- 4. Add expire_overdue_subscriptions(): CCAvenue has no auto-recurring billing here,
--    so lapsed subscriptions are marked past_due and features downgraded to dashboard-only
--    (user can still log in and renew from /pricing).
-- 5. Schedule maintenance jobs via pg_cron when the extension is available.

-- One Success transaction per order (blocks replayed callbacks at the DB level)
CREATE UNIQUE INDEX IF NOT EXISTS uq_payment_transactions_success_per_order
  ON public.payment_transactions(order_id)
  WHERE order_status = 'Success';

CREATE OR REPLACE FUNCTION public.activate_subscription_on_payment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order RECORD;
  v_plan_features jsonb;
BEGIN
  -- Only process successful payments
  IF NEW.order_status != 'Success' THEN
    RETURN NEW;
  END IF;

  -- Lock the order row so concurrent callbacks serialize
  SELECT * INTO v_order
  FROM public.payment_orders
  WHERE id = NEW.order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  -- Idempotency: if this order was already completed, do not extend the period again
  IF v_order.status = 'completed' THEN
    RETURN NEW;
  END IF;

  -- Update payment order status
  UPDATE public.payment_orders
  SET status = 'completed', updated_at = now()
  WHERE id = NEW.order_id;

  -- Get features for the plan (jsonb, matching users.enabled_features)
  SELECT COALESCE(jsonb_agg(feature_id), '[]'::jsonb) INTO v_plan_features
  FROM public.saas_plan_features
  WHERE plan_id = v_order.plan_id;

  -- Update or insert user subscription
  INSERT INTO public.user_subscriptions (
    user_id,
    plan_id,
    status,
    billing_provider,
    provider_subscription_id,
    current_period_start,
    current_period_end,
    enabled_feature_overrides
  ) VALUES (
    v_order.user_id,
    v_order.plan_id,
    'active',
    'ccavenue',
    NEW.tracking_id,
    now(),
    CASE
      WHEN v_order.billing_cycle = 'yearly' THEN now() + interval '1 year'
      ELSE now() + interval '1 month'
    END,
    v_plan_features
  )
  ON CONFLICT (user_id) DO UPDATE SET
    plan_id = EXCLUDED.plan_id,
    status = 'active',
    billing_provider = 'ccavenue',
    provider_subscription_id = NEW.tracking_id,
    current_period_start = now(),
    -- Renewal before expiry extends from the current period end, not from today
    current_period_end = CASE
      WHEN user_subscriptions.plan_id = EXCLUDED.plan_id
        AND user_subscriptions.status = 'active'
        AND user_subscriptions.current_period_end IS NOT NULL
        AND user_subscriptions.current_period_end > now()
      THEN user_subscriptions.current_period_end +
        CASE WHEN v_order.billing_cycle = 'yearly' THEN interval '1 year' ELSE interval '1 month' END
      ELSE
        CASE WHEN v_order.billing_cycle = 'yearly' THEN now() + interval '1 year' ELSE now() + interval '1 month' END
    END,
    enabled_feature_overrides = v_plan_features,
    updated_at = now();

  -- Sync the user's enabled_features (jsonb array)
  UPDATE public.users
  SET enabled_features = v_plan_features
  WHERE id = v_order.user_id;

  RETURN NEW;
END;
$$;

-- Trigger already exists from the previous migration; recreate defensively
DROP TRIGGER IF EXISTS trg_activate_subscription_on_payment ON public.payment_transactions;
CREATE TRIGGER trg_activate_subscription_on_payment
  AFTER INSERT ON public.payment_transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.activate_subscription_on_payment();

-- Mark lapsed CCAvenue subscriptions past_due and downgrade access.
-- 3-day grace period after current_period_end. Only touches ccavenue-billed
-- subscriptions, so grandfathered/manual accounts are never downgraded.
CREATE OR REPLACE FUNCTION public.expire_overdue_subscriptions()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  expired_count integer;
BEGIN
  WITH lapsed AS (
    UPDATE public.user_subscriptions
    SET status = 'past_due', updated_at = now()
    WHERE status = 'active'
      AND billing_provider = 'ccavenue'
      AND current_period_end IS NOT NULL
      AND current_period_end < now() - interval '3 days'
    RETURNING user_id
  )
  UPDATE public.users u
  SET enabled_features = '["dashboard"]'::jsonb
  FROM lapsed l
  WHERE u.id = l.user_id;

  GET DIAGNOSTICS expired_count = ROW_COUNT;
  RETURN expired_count;
END;
$$;

-- Guest checkout: anonymous visitors (ad landing pages) must be able to read
-- active plans and their features to render pricing before they have an account.
DROP POLICY IF EXISTS "Anyone can view active SaaS plans" ON public.saas_plans;
CREATE POLICY "Anyone can view active SaaS plans"
  ON public.saas_plans
  FOR SELECT
  TO anon
  USING (is_active);

DROP POLICY IF EXISTS "Anyone can view active SaaS plan features" ON public.saas_plan_features;
CREATE POLICY "Anyone can view active SaaS plan features"
  ON public.saas_plan_features
  FOR SELECT
  TO anon
  USING (
    EXISTS (
      SELECT 1 FROM public.saas_plans p
      WHERE p.id = plan_id AND p.is_active
    )
  );

-- Schedule maintenance via pg_cron when available (no-op otherwise; the
-- ccavenue-reconcile edge function cron also calls these as a fallback)
DO $$
BEGIN
  CREATE EXTENSION IF NOT EXISTS pg_cron;

  PERFORM cron.unschedule(jobid)
  FROM cron.job
  WHERE jobname IN ('expire-pending-payment-orders', 'expire-overdue-subscriptions');

  PERFORM cron.schedule(
    'expire-pending-payment-orders',
    '*/15 * * * *',
    $job$SELECT public.expire_pending_payment_orders();$job$
  );

  PERFORM cron.schedule(
    'expire-overdue-subscriptions',
    '30 2 * * *',
    $job$SELECT public.expire_overdue_subscriptions();$job$
  );
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'pg_cron not available, skipping cron scheduling: %', SQLERRM;
END;
$$;
