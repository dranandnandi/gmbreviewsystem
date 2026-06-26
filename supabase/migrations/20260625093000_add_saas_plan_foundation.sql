-- SaaS foundation: add plans, plan features, subscriptions, and usage events.
-- This is intentionally additive. Existing access still comes from users.enabled_features.
-- Existing users receive an active subscription row that snapshots their current features.

CREATE OR REPLACE FUNCTION public.is_platform_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.users
    WHERE auth_id = auth.uid()
      AND role IN ('admin', 'super_admin')
  );
END;
$$;

CREATE TABLE IF NOT EXISTS public.saas_plans (
  id text PRIMARY KEY,
  name text NOT NULL,
  description text,
  monthly_price numeric(10, 2) NOT NULL DEFAULT 0,
  yearly_price numeric(10, 2),
  currency text NOT NULL DEFAULT 'INR',
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.saas_plan_features (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id text NOT NULL REFERENCES public.saas_plans(id) ON DELETE CASCADE,
  feature_id text NOT NULL,
  limits jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (plan_id, feature_id)
);

CREATE TABLE IF NOT EXISTS public.user_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  plan_id text REFERENCES public.saas_plans(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('trialing', 'active', 'past_due', 'paused', 'cancelled')),
  billing_provider text,
  provider_customer_id text,
  provider_subscription_id text,
  current_period_start timestamptz,
  current_period_end timestamptz,
  trial_ends_at timestamptz,
  cancel_at_period_end boolean NOT NULL DEFAULT false,
  enabled_feature_overrides jsonb,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id)
);

CREATE TABLE IF NOT EXISTS public.usage_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  feature_id text NOT NULL,
  event_type text NOT NULL,
  quantity integer NOT NULL DEFAULT 1 CHECK (quantity > 0),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.saas_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saas_plan_features ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can view active SaaS plans" ON public.saas_plans;
CREATE POLICY "Authenticated users can view active SaaS plans"
  ON public.saas_plans
  FOR SELECT
  TO authenticated
  USING (is_active OR public.is_platform_admin());

DROP POLICY IF EXISTS "Platform admins can manage SaaS plans" ON public.saas_plans;
CREATE POLICY "Platform admins can manage SaaS plans"
  ON public.saas_plans
  FOR ALL
  TO authenticated
  USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());

DROP POLICY IF EXISTS "Authenticated users can view SaaS plan features" ON public.saas_plan_features;
CREATE POLICY "Authenticated users can view SaaS plan features"
  ON public.saas_plan_features
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.saas_plans p
      WHERE p.id = plan_id
        AND (p.is_active OR public.is_platform_admin())
    )
  );

DROP POLICY IF EXISTS "Platform admins can manage SaaS plan features" ON public.saas_plan_features;
CREATE POLICY "Platform admins can manage SaaS plan features"
  ON public.saas_plan_features
  FOR ALL
  TO authenticated
  USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());

DROP POLICY IF EXISTS "Users can view their own subscriptions" ON public.user_subscriptions;
CREATE POLICY "Users can view their own subscriptions"
  ON public.user_subscriptions
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = user_id AND u.auth_id = auth.uid()
    )
    OR public.is_platform_admin()
  );

DROP POLICY IF EXISTS "Platform admins can manage subscriptions" ON public.user_subscriptions;
CREATE POLICY "Platform admins can manage subscriptions"
  ON public.user_subscriptions
  FOR ALL
  TO authenticated
  USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());

DROP POLICY IF EXISTS "Users can view their own usage events" ON public.usage_events;
CREATE POLICY "Users can view their own usage events"
  ON public.usage_events
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = user_id AND u.auth_id = auth.uid()
    )
    OR public.is_platform_admin()
  );

DROP POLICY IF EXISTS "Platform admins can manage usage events" ON public.usage_events;
CREATE POLICY "Platform admins can manage usage events"
  ON public.usage_events
  FOR ALL
  TO authenticated
  USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());

INSERT INTO public.saas_plans (id, name, description, monthly_price, yearly_price, currency, sort_order)
VALUES
  ('review_booster', 'Review Booster', 'AI-assisted review requests and Google review follow-up.', 999, 9990, 'INR', 10),
  ('appointment_reminder', 'Appointment Reminder', 'Appointment booking, tracking, and reminder workflows.', 999, 9990, 'INR', 20),
  ('sequence_sender', 'Sequence Sender', 'Drip sequence templates, AI sequence generation, and sending workflows.', 1499, 14990, 'INR', 30),
  ('smart_reports', 'Smart Reports', 'Report uploads, smart report requests, PDF merge, and report sharing.', 1999, 19990, 'INR', 40),
  ('clinic_growth_suite', 'Clinic Growth Suite', 'All clinic growth modules in one workspace.', 3999, 39990, 'INR', 50)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  monthly_price = EXCLUDED.monthly_price,
  yearly_price = EXCLUDED.yearly_price,
  currency = EXCLUDED.currency,
  sort_order = EXCLUDED.sort_order,
  updated_at = now();

INSERT INTO public.saas_plan_features (plan_id, feature_id)
VALUES
  ('review_booster', 'dashboard'),
  ('review_booster', 'reviews'),
  ('appointment_reminder', 'dashboard'),
  ('appointment_reminder', 'appointments'),
  ('sequence_sender', 'dashboard'),
  ('sequence_sender', 'reviews'),
  ('sequence_sender', 'sequences'),
  ('smart_reports', 'dashboard'),
  ('smart_reports', 'reports'),
  ('clinic_growth_suite', 'dashboard'),
  ('clinic_growth_suite', 'appointments'),
  ('clinic_growth_suite', 'reviews'),
  ('clinic_growth_suite', 'sequences'),
  ('clinic_growth_suite', 'creatives'),
  ('clinic_growth_suite', 'reports')
ON CONFLICT (plan_id, feature_id) DO NOTHING;

INSERT INTO public.user_subscriptions (user_id, status, enabled_feature_overrides, notes)
SELECT
  u.id,
  'active',
  COALESCE(u.enabled_features, '[]'::jsonb),
  'Created by SaaS foundation migration; preserves current enabled_features access.'
FROM public.users u
ON CONFLICT (user_id) DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_saas_plan_features_plan_id ON public.saas_plan_features(plan_id);
CREATE INDEX IF NOT EXISTS idx_saas_plan_features_feature_id ON public.saas_plan_features(feature_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_id ON public.user_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_plan_id ON public.user_subscriptions(plan_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_status ON public.user_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_usage_events_user_feature_created ON public.usage_events(user_id, feature_id, created_at DESC);
