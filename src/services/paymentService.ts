import { supabase } from './supabaseClient';
import type {
  SaasPlan,
  SaasPlanFeature,
  UserSubscription,
  PaymentOrder,
  PaymentInitiateRequest,
  PaymentInitiateResponse,
  BillingCycle
} from '../types';

/**
 * Fetch all active SaaS plans
 */
export async function fetchPlans(): Promise<SaasPlan[]> {
  const { data, error } = await supabase
    .from('saas_plans')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true });

  if (error) throw error;

  return data.map((plan: any) => ({
    id: plan.id,
    name: plan.name,
    description: plan.description,
    monthlyPrice: parseFloat(plan.monthly_price),
    yearlyPrice: plan.yearly_price ? parseFloat(plan.yearly_price) : null,
    currency: plan.currency,
    isActive: plan.is_active,
    sortOrder: plan.sort_order,
    metadata: plan.metadata || {}
  }));
}

/**
 * Fetch features for a specific plan
 */
export async function fetchPlanFeatures(planId: string): Promise<SaasPlanFeature[]> {
  const { data, error } = await supabase
    .from('saas_plan_features')
    .select('*')
    .eq('plan_id', planId);

  if (error) throw error;

  return data.map((f: any) => ({
    id: f.id,
    planId: f.plan_id,
    featureId: f.feature_id,
    limits: f.limits || {}
  }));
}

/**
 * Fetch current user's subscription
 */
export async function fetchUserSubscription(): Promise<UserSubscription | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  // Get user's internal ID
  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('id')
    .eq('auth_id', user.id)
    .single();

  if (userError || !userData) return null;

  const { data, error } = await supabase
    .from('user_subscriptions')
    .select('*')
    .eq('user_id', userData.id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // No subscription found
    throw error;
  }

  return {
    id: data.id,
    userId: data.user_id,
    planId: data.plan_id,
    status: data.status,
    billingProvider: data.billing_provider,
    providerCustomerId: data.provider_customer_id,
    providerSubscriptionId: data.provider_subscription_id,
    currentPeriodStart: data.current_period_start,
    currentPeriodEnd: data.current_period_end,
    trialEndsAt: data.trial_ends_at,
    cancelAtPeriodEnd: data.cancel_at_period_end,
    enabledFeatureOverrides: data.enabled_feature_overrides,
    notes: data.notes,
    createdAt: data.created_at,
    updatedAt: data.updated_at
  };
}

/**
 * Fetch user's payment history
 */
export async function fetchPaymentHistory(): Promise<PaymentOrder[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: userData } = await supabase
    .from('users')
    .select('id')
    .eq('auth_id', user.id)
    .single();

  if (!userData) return [];

  const { data, error } = await supabase
    .from('payment_orders')
    .select('*')
    .eq('user_id', userData.id)
    .order('created_at', { ascending: false });

  if (error) throw error;

  return data.map((order: any) => ({
    id: order.id,
    userId: order.user_id,
    planId: order.plan_id,
    billingCycle: order.billing_cycle,
    amount: parseFloat(order.amount),
    currency: order.currency,
    status: order.status,
    ccavenueOrderId: order.ccavenue_order_id,
    createdAt: order.created_at,
    expiresAt: order.expires_at
  }));
}

/**
 * Initiate CCAvenue payment
 */
export async function initiatePayment(
  request: PaymentInitiateRequest
): Promise<PaymentInitiateResponse> {
  const { data, error } = await supabase.functions.invoke('ccavenue-initiate', {
    body: request
  });

  if (error) {
    console.error('Payment initiation error:', error);
    return { success: false, error: error.message };
  }

  return data as PaymentInitiateResponse;
}

export interface GuestCheckoutRequest {
  plan_id: string;
  billing_cycle: BillingCycle;
  business_name: string;
  admin_name: string;
  email: string;
  phone: string;
  password: string;
  whatsapp?: string;
  gmb_link?: string;
  city?: string;
  state?: string;
}

/**
 * Guest checkout: creates the account (no features until payment) and
 * returns the encrypted CCAvenue payload. Works without a session.
 */
export async function initiateGuestCheckout(
  request: GuestCheckoutRequest
): Promise<PaymentInitiateResponse & { code?: string }> {
  const { data, error } = await supabase.functions.invoke('ccavenue-guest-checkout', {
    body: request
  });

  if (error) {
    // supabase.functions.invoke wraps non-2xx responses; surface the function's message
    try {
      const ctx = (error as any).context;
      if (ctx && typeof ctx.json === 'function') {
        const payload = await ctx.json();
        if (payload?.error) return { success: false, error: payload.error, code: payload.code };
      }
    } catch {
      // fall through to generic message
    }
    console.error('Guest checkout error:', error);
    return { success: false, error: error.message };
  }

  return data as PaymentInitiateResponse & { code?: string };
}

/**
 * Redirect to CCAvenue payment page
 */
export function redirectToCCAvenue(
  paymentUrl: string,
  encryptedData: string,
  accessCode: string
): void {
  // Create a form and submit it (CCAvenue requires POST)
  const form = document.createElement('form');
  form.method = 'POST';
  form.action = paymentUrl;

  const encReqInput = document.createElement('input');
  encReqInput.type = 'hidden';
  encReqInput.name = 'encRequest';
  encReqInput.value = encryptedData;
  form.appendChild(encReqInput);

  const accessCodeInput = document.createElement('input');
  accessCodeInput.type = 'hidden';
  accessCodeInput.name = 'access_code';
  accessCodeInput.value = accessCode;
  form.appendChild(accessCodeInput);

  document.body.appendChild(form);
  form.submit();
}

/**
 * Calculate yearly savings percentage
 */
export function calculateYearlySavings(monthlyPrice: number, yearlyPrice: number): number {
  const yearlyEquivalent = monthlyPrice * 12;
  const savings = ((yearlyEquivalent - yearlyPrice) / yearlyEquivalent) * 100;
  return Math.round(savings);
}

/**
 * Format price for display
 */
export function formatPrice(amount: number, currency: string = 'INR'): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
}
