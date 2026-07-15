-- CCAvenue Payment Gateway Integration Tables
-- Orders are created before redirecting user to CCAvenue
-- Transactions store the response from CCAvenue callback

-- Payment orders: track payment attempts before CCAvenue redirect
CREATE TABLE IF NOT EXISTS public.payment_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  plan_id text NOT NULL REFERENCES public.saas_plans(id) ON DELETE RESTRICT,
  billing_cycle text NOT NULL CHECK (billing_cycle IN ('monthly', 'yearly')),
  amount numeric(10, 2) NOT NULL,
  currency text NOT NULL DEFAULT 'INR',
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled', 'expired')),
  ccavenue_order_id text UNIQUE,
  merchant_param1 text, -- Can store user_id or other reference
  merchant_param2 text, -- Can store plan_id
  merchant_param3 text, -- Extra metadata
  redirect_url text,
  cancel_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '30 minutes'),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Payment transactions: CCAvenue callback response records
CREATE TABLE IF NOT EXISTS public.payment_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.payment_orders(id) ON DELETE CASCADE,
  tracking_id text,           -- CCAvenue tracking ID
  bank_ref_no text,           -- Bank reference number
  order_status text NOT NULL, -- Success, Failure, Aborted, Invalid
  payment_mode text,          -- Credit Card, Debit Card, Net Banking, UPI, Wallet, etc.
  card_name text,             -- Card type/name if applicable
  status_code text,           -- CCAvenue status code
  status_message text,        -- CCAvenue status message
  currency text DEFAULT 'INR',
  amount numeric(10, 2),
  billing_name text,
  billing_email text,
  billing_tel text,
  billing_address text,
  billing_city text,
  billing_state text,
  billing_zip text,
  billing_country text,
  response_code text,
  failure_message text,
  raw_response jsonb,         -- Store full decrypted response for debugging
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.payment_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for payment_orders
DROP POLICY IF EXISTS "Users can view their own payment orders" ON public.payment_orders;
CREATE POLICY "Users can view their own payment orders"
  ON public.payment_orders
  FOR SELECT
  TO authenticated
  USING (
    user_id IN (
      SELECT id FROM public.users WHERE auth_id = auth.uid()
    )
    OR public.is_platform_admin()
  );

DROP POLICY IF EXISTS "Users can create their own payment orders" ON public.payment_orders;
CREATE POLICY "Users can create their own payment orders"
  ON public.payment_orders
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id IN (
      SELECT id FROM public.users WHERE auth_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Platform admins can manage all payment orders" ON public.payment_orders;
CREATE POLICY "Platform admins can manage all payment orders"
  ON public.payment_orders
  FOR ALL
  TO authenticated
  USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());

-- RLS Policies for payment_transactions
DROP POLICY IF EXISTS "Users can view their own payment transactions" ON public.payment_transactions;
CREATE POLICY "Users can view their own payment transactions"
  ON public.payment_transactions
  FOR SELECT
  TO authenticated
  USING (
    order_id IN (
      SELECT po.id FROM public.payment_orders po
      JOIN public.users u ON po.user_id = u.id
      WHERE u.auth_id = auth.uid()
    )
    OR public.is_platform_admin()
  );

DROP POLICY IF EXISTS "Platform admins can manage all payment transactions" ON public.payment_transactions;
CREATE POLICY "Platform admins can manage all payment transactions"
  ON public.payment_transactions
  FOR ALL
  TO authenticated
  USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_payment_orders_user_id ON public.payment_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_orders_status ON public.payment_orders(status);
CREATE INDEX IF NOT EXISTS idx_payment_orders_ccavenue_order_id ON public.payment_orders(ccavenue_order_id);
CREATE INDEX IF NOT EXISTS idx_payment_orders_created_at ON public.payment_orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_order_id ON public.payment_transactions(order_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_tracking_id ON public.payment_transactions(tracking_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_order_status ON public.payment_transactions(order_status);

-- Function to activate subscription after successful payment
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

  -- Get the order details
  SELECT * INTO v_order
  FROM public.payment_orders
  WHERE id = NEW.order_id;

  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  -- Update payment order status
  UPDATE public.payment_orders
  SET status = 'completed', updated_at = now()
  WHERE id = NEW.order_id;

  -- Get features for the plan
  SELECT jsonb_agg(feature_id) INTO v_plan_features
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
    current_period_end = CASE
      WHEN v_order.billing_cycle = 'yearly' THEN now() + interval '1 year'
      ELSE now() + interval '1 month'
    END,
    enabled_feature_overrides = v_plan_features,
    updated_at = now();

  -- Update user's enabled_features array
  UPDATE public.users
  SET enabled_features = (
    SELECT COALESCE(array_agg(feature_id), ARRAY[]::text[])
    FROM public.saas_plan_features
    WHERE plan_id = v_order.plan_id
  )
  WHERE id = v_order.user_id;

  RETURN NEW;
END;
$$;

-- Trigger to activate subscription on successful payment
DROP TRIGGER IF EXISTS trg_activate_subscription_on_payment ON public.payment_transactions;
CREATE TRIGGER trg_activate_subscription_on_payment
  AFTER INSERT ON public.payment_transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.activate_subscription_on_payment();

-- Function to expire old pending orders (can be called by cron)
CREATE OR REPLACE FUNCTION public.expire_pending_payment_orders()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  expired_count integer;
BEGIN
  UPDATE public.payment_orders
  SET status = 'expired', updated_at = now()
  WHERE status = 'pending'
    AND expires_at < now();

  GET DIAGNOSTICS expired_count = ROW_COUNT;
  RETURN expired_count;
END;
$$;

-- Add service role policy for edge functions (they use service role key)
DROP POLICY IF EXISTS "Service role can manage payment orders" ON public.payment_orders;
CREATE POLICY "Service role can manage payment orders"
  ON public.payment_orders
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Service role can manage payment transactions" ON public.payment_transactions;
CREATE POLICY "Service role can manage payment transactions"
  ON public.payment_transactions
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
