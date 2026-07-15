import React, { useState, useEffect } from 'react';
import { Check, Loader2, CreditCard, AlertCircle } from 'lucide-react';
import { useStore } from '../store/useStore';
import { PRODUCTS } from '../config/products';
import {
  fetchPlans,
  fetchPlanFeatures,
  fetchUserSubscription,
  initiatePayment,
  redirectToCCAvenue,
  calculateYearlySavings,
  formatPrice
} from '../services/paymentService';
import type { SaasPlan, SaasPlanFeature, UserSubscription, BillingCycle } from '../types';

export function PricingPage() {
  const { user } = useStore();
  const [plans, setPlans] = useState<SaasPlan[]>([]);
  const [planFeatures, setPlanFeatures] = useState<Record<string, SaasPlanFeature[]>>({});
  const [subscription, setSubscription] = useState<UserSubscription | null>(null);
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('monthly');
  const [loading, setLoading] = useState(true);
  const [processingPlanId, setProcessingPlanId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      const [plansData, subscriptionData] = await Promise.all([
        fetchPlans(),
        fetchUserSubscription()
      ]);
      setPlans(plansData);
      setSubscription(subscriptionData);

      // Load features for each plan
      const featuresMap: Record<string, SaasPlanFeature[]> = {};
      await Promise.all(
        plansData.map(async (plan) => {
          const features = await fetchPlanFeatures(plan.id);
          featuresMap[plan.id] = features;
        })
      );
      setPlanFeatures(featuresMap);
    } catch (err) {
      console.error('Error loading pricing data:', err);
      setError('Failed to load pricing information');
    } finally {
      setLoading(false);
    }
  }

  async function handleSubscribe(planId: string, cycle: BillingCycle) {
    if (!user) {
      setError('Please log in to subscribe');
      return;
    }

    setProcessingPlanId(planId);
    setError(null);

    try {
      const response = await initiatePayment({
        plan_id: planId,
        billing_cycle: cycle,
        billing_name: user.name,
        billing_email: user.contactEmail,
        billing_tel: user.contactPhone
      });

      if (!response.success || !response.encrypted_data || !response.access_code || !response.payment_url) {
        throw new Error(response.error || 'Failed to initiate payment');
      }

      // Redirect to CCAvenue
      redirectToCCAvenue(response.payment_url, response.encrypted_data, response.access_code);
    } catch (err) {
      console.error('Payment error:', err);
      setError(err instanceof Error ? err.message : 'Payment failed');
      setProcessingPlanId(null);
    }
  }

  function getProductForPlan(planId: string) {
    const slugMap: Record<string, string> = {
      review_booster: 'review-booster',
      appointment_reminder: 'appointment-reminder',
      sequence_sender: 'sequence-sender',
      smart_reports: 'smart-reports',
      clinic_growth_suite: 'clinic-growth-suite'
    };
    return PRODUCTS.find((p) => p.slug === slugMap[planId]);
  }

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900">Choose Your Plan</h1>
        <p className="mt-2 text-gray-600">
          Select the plan that best fits your clinic's needs
        </p>
      </div>

      {error && (
        <div className="mx-auto max-w-md rounded-lg border border-red-200 bg-red-50 p-4">
          <div className="flex items-center gap-2 text-red-800">
            <AlertCircle className="h-5 w-5" />
            <span>{error}</span>
          </div>
        </div>
      )}

      {/* Billing cycle toggle */}
      <div className="flex justify-center">
        <div className="inline-flex rounded-lg border border-gray-200 bg-white p-1">
          <button
            onClick={() => setBillingCycle('monthly')}
            className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              billingCycle === 'monthly'
                ? 'bg-indigo-600 text-white'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setBillingCycle('yearly')}
            className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              billingCycle === 'yearly'
                ? 'bg-indigo-600 text-white'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Yearly
            <span className="ml-1 rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700">
              Save 17%
            </span>
          </button>
        </div>
      </div>

      {/* Current subscription banner */}
      {subscription && subscription.status === 'active' && subscription.planId && (
        <div className="mx-auto max-w-2xl rounded-lg border border-green-200 bg-green-50 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-green-800">
                Current Plan: {plans.find((p) => p.id === subscription.planId)?.name || subscription.planId}
              </p>
              {subscription.currentPeriodEnd && (
                <p className="text-sm text-green-600">
                  Renews on {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
                </p>
              )}
            </div>
            <span className="rounded-full bg-green-200 px-3 py-1 text-sm font-medium text-green-800">
              Active
            </span>
          </div>
        </div>
      )}

      {/* Plans grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {plans.map((plan) => {
          const product = getProductForPlan(plan.id);
          const features = planFeatures[plan.id] || [];
          // Yearly-only plans (monthly_price = 0) always display and charge yearly
          const yearlyOnly = plan.monthlyPrice <= 0 && !!plan.yearlyPrice;
          const effectiveCycle: BillingCycle = yearlyOnly ? 'yearly' : billingCycle;
          const price = effectiveCycle === 'yearly' && plan.yearlyPrice
            ? plan.yearlyPrice
            : plan.monthlyPrice;
          const isCurrentPlan = subscription?.planId === plan.id && subscription?.status === 'active';
          const isProcessing = processingPlanId === plan.id;
          const savings = plan.yearlyPrice && plan.monthlyPrice > 0
            ? calculateYearlySavings(plan.monthlyPrice, plan.yearlyPrice)
            : 0;

          return (
            <div
              key={plan.id}
              className={`relative overflow-hidden rounded-xl border bg-white shadow-sm ${
                plan.id === 'clinic_growth_suite'
                  ? 'border-indigo-500 ring-2 ring-indigo-500'
                  : 'border-gray-200'
              }`}
            >
              {plan.id === 'clinic_growth_suite' && (
                <div className="absolute right-0 top-0 rounded-bl-lg bg-indigo-600 px-3 py-1 text-xs font-semibold text-white">
                  Best Value
                </div>
              )}

              {product && (
                <div className={`h-2 bg-gradient-to-r ${product.accentClass}`} />
              )}

              <div className="p-6">
                <h3 className="text-xl font-semibold text-gray-900">{plan.name}</h3>
                {plan.description && (
                  <p className="mt-1 text-sm text-gray-500">{plan.description}</p>
                )}

                <div className="mt-4">
                  <span className="text-3xl font-bold text-gray-900">
                    {formatPrice(price, plan.currency)}
                  </span>
                  <span className="text-gray-500">
                    /{effectiveCycle === 'yearly' ? 'year' : 'month'}
                  </span>
                  {yearlyOnly && (
                    <span className="ml-2 rounded-full bg-indigo-100 px-2 py-1 text-xs font-medium text-indigo-700">
                      Annual plan
                    </span>
                  )}
                  {effectiveCycle === 'yearly' && savings > 0 && (
                    <span className="ml-2 rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-700">
                      Save {savings}%
                    </span>
                  )}
                </div>

                <ul className="mt-6 space-y-3">
                  {features.map((feature) => (
                    <li key={feature.id} className="flex items-start gap-2">
                      <Check className="mt-0.5 h-5 w-5 flex-shrink-0 text-green-500" />
                      <span className="text-sm text-gray-600 capitalize">
                        {feature.featureId.replace(/_/g, ' ')}
                      </span>
                    </li>
                  ))}
                  {product?.outcomes.map((outcome, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <Check className="mt-0.5 h-5 w-5 flex-shrink-0 text-green-500" />
                      <span className="text-sm text-gray-600">{outcome}</span>
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => handleSubscribe(plan.id, effectiveCycle)}
                  disabled={isCurrentPlan || isProcessing || !user}
                  className={`mt-6 flex w-full items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-semibold transition-colors ${
                    isCurrentPlan
                      ? 'cursor-not-allowed bg-gray-100 text-gray-500'
                      : plan.id === 'clinic_growth_suite'
                      ? 'bg-indigo-600 text-white hover:bg-indigo-700 disabled:bg-indigo-300'
                      : 'bg-gray-900 text-white hover:bg-gray-800 disabled:bg-gray-300'
                  }`}
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : isCurrentPlan ? (
                    'Current Plan'
                  ) : (
                    <>
                      <CreditCard className="h-4 w-4" />
                      Subscribe
                    </>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Trust badges */}
      <div className="mt-12 text-center">
        <p className="text-sm text-gray-500">
          Secure payments powered by CCAvenue. All major cards, UPI, and net banking accepted.
        </p>
        <div className="mt-4 flex items-center justify-center gap-4 opacity-60">
          <span className="text-xs text-gray-400">Visa</span>
          <span className="text-xs text-gray-400">Mastercard</span>
          <span className="text-xs text-gray-400">RuPay</span>
          <span className="text-xs text-gray-400">UPI</span>
          <span className="text-xs text-gray-400">Net Banking</span>
        </div>
      </div>
    </div>
  );
}
