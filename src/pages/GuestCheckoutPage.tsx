import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { Loader2, CreditCard, AlertCircle, ShieldCheck, Check, Eye, EyeOff } from 'lucide-react';
import { PRODUCTS } from '../config/products';
import {
  fetchPlans,
  initiateGuestCheckout,
  redirectToCCAvenue,
  calculateYearlySavings,
  formatPrice
} from '../services/paymentService';
import type { SaasPlan, BillingCycle } from '../types';

const PLAN_TO_PRODUCT_SLUG: Record<string, string> = {
  review_booster: 'review-booster',
  appointment_reminder: 'appointment-reminder',
  sequence_sender: 'sequence-sender',
  smart_reports: 'smart-reports',
  clinic_growth_suite: 'clinic-growth-suite'
};

export function GuestCheckoutPage() {
  const { planId } = useParams<{ planId: string }>();
  const [searchParams] = useSearchParams();

  const [plan, setPlan] = useState<SaasPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accountExists, setAccountExists] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [billingCycle, setBillingCycle] = useState<BillingCycle>(
    searchParams.get('cycle') === 'yearly' ? 'yearly' : 'monthly'
  );

  const [form, setForm] = useState({
    businessName: '',
    adminName: '',
    email: '',
    phone: '',
    password: '',
    city: ''
  });

  const product = planId ? PRODUCTS.find((p) => p.slug === PLAN_TO_PRODUCT_SLUG[planId]) : undefined;

  useEffect(() => {
    async function load() {
      try {
        const plans = await fetchPlans();
        const found = plans.find((p) => p.id === planId) || null;
        setPlan(found);
        if (!found) {
          setError('This plan is not available.');
        } else if (found.monthlyPrice <= 0 && found.yearlyPrice) {
          // Yearly-only plan: monthly cycle is not offered
          setBillingCycle('yearly');
        }
      } catch (err) {
        console.error('Error loading plan:', err);
        setError('Could not load plan details. Please refresh.');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [planId]);

  const yearlyOnly = !!plan && plan.monthlyPrice <= 0 && !!plan.yearlyPrice;
  const price = plan
    ? billingCycle === 'yearly' && plan.yearlyPrice ? plan.yearlyPrice : plan.monthlyPrice
    : 0;
  const savings = plan?.yearlyPrice && plan.monthlyPrice > 0
    ? calculateYearlySavings(plan.monthlyPrice, plan.yearlyPrice)
    : 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!plan) return;
    setSubmitting(true);
    setError(null);
    setAccountExists(false);

    try {
      const response = await initiateGuestCheckout({
        plan_id: plan.id,
        billing_cycle: billingCycle,
        business_name: form.businessName,
        admin_name: form.adminName,
        email: form.email,
        phone: form.phone,
        password: form.password,
        city: form.city || undefined
      });

      if (!response.success || !response.encrypted_data || !response.access_code || !response.payment_url) {
        if (response.code === 'account_exists') setAccountExists(true);
        throw new Error(response.error || 'Failed to start payment');
      }

      redirectToCCAvenue(response.payment_url, response.encrypted_data, response.access_code);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-4">
        <AlertCircle className="h-10 w-10 text-red-500" />
        <p className="mt-4 text-gray-700">{error || 'Plan not found.'}</p>
        <Link to="/pricing" className="mt-4 text-indigo-600 hover:underline">View all plans</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="mx-auto grid max-w-4xl gap-8 md:grid-cols-5">
        {/* Order summary */}
        <div className="md:col-span-2">
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            {product && <div className={`-mx-6 -mt-6 mb-4 h-2 rounded-t-xl bg-gradient-to-r ${product.accentClass}`} />}
            <h2 className="text-lg font-semibold text-gray-900">{plan.name}</h2>
            {plan.description && <p className="mt-1 text-sm text-gray-500">{plan.description}</p>}

            {!yearlyOnly && (
              <div className="mt-4 flex rounded-lg border border-gray-200 p-1">
                <button
                  type="button"
                  onClick={() => setBillingCycle('monthly')}
                  className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium ${
                    billingCycle === 'monthly' ? 'bg-indigo-600 text-white' : 'text-gray-600'
                  }`}
                >
                  Monthly
                </button>
                {plan.yearlyPrice && (
                  <button
                    type="button"
                    onClick={() => setBillingCycle('yearly')}
                    className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium ${
                      billingCycle === 'yearly' ? 'bg-indigo-600 text-white' : 'text-gray-600'
                    }`}
                  >
                    Yearly {savings > 0 && <span className="text-xs">(-{savings}%)</span>}
                  </button>
                )}
              </div>
            )}
            {yearlyOnly && (
              <p className="mt-4 rounded-lg bg-indigo-50 px-3 py-2 text-xs font-medium text-indigo-700">
                Annual plan — billed once a year
              </p>
            )}

            <div className="mt-4">
              <span className="text-3xl font-bold text-gray-900">{formatPrice(price, plan.currency)}</span>
              <span className="text-gray-500">/{billingCycle === 'yearly' ? 'year' : 'month'}</span>
            </div>

            {product && (
              <ul className="mt-4 space-y-2">
                {product.outcomes.map((outcome, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm text-gray-600">
                    <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-500" />
                    {outcome}
                  </li>
                ))}
              </ul>
            )}

            <p className="mt-6 flex items-center gap-2 text-xs text-gray-400">
              <ShieldCheck className="h-4 w-4" />
              Secure payment via CCAvenue — cards, UPI, net banking
            </p>
          </div>
        </div>

        {/* Checkout form */}
        <div className="md:col-span-3">
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h1 className="text-xl font-bold text-gray-900">Create your account &amp; pay</h1>
            <p className="mt-1 text-sm text-gray-500">
              Your account is activated instantly after payment.
            </p>

            {error && (
              <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                <div className="flex items-start gap-2">
                  <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                  <div>
                    {error}
                    {accountExists && (
                      <>
                        {' '}
                        <Link to="/login?next=/pricing" className="font-semibold underline">
                          Log in here
                        </Link>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-5 space-y-4">
              <FormField
                label="Business / Clinic Name"
                value={form.businessName}
                onChange={(v) => setForm({ ...form, businessName: v })}
                required
                placeholder="e.g. City Care Clinic"
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  label="Your Name"
                  value={form.adminName}
                  onChange={(v) => setForm({ ...form, adminName: v })}
                  required
                  placeholder="Full name"
                />
                <FormField
                  label="City"
                  value={form.city}
                  onChange={(v) => setForm({ ...form, city: v })}
                  placeholder="Optional"
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  label="Email"
                  type="email"
                  value={form.email}
                  onChange={(v) => setForm({ ...form, email: v })}
                  required
                  placeholder="you@business.com"
                />
                <FormField
                  label="Phone"
                  type="tel"
                  value={form.phone}
                  onChange={(v) => setForm({ ...form, phone: v })}
                  required
                  placeholder="10-digit mobile"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Set a Password <span className="text-red-500">*</span>
                </label>
                <div className="relative mt-1">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    placeholder="Min 8 chars: A-z, 0-9, symbol"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 pr-10 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <p className="mt-1 text-xs text-gray-400">
                  You'll use this email &amp; password to log in after payment.
                </p>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-3 text-sm font-semibold text-white hover:bg-indigo-700 disabled:bg-indigo-300"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Preparing secure payment...
                  </>
                ) : (
                  <>
                    <CreditCard className="h-4 w-4" />
                    Pay {formatPrice(price, plan.currency)} &amp; Activate
                  </>
                )}
              </button>

              <p className="text-center text-xs text-gray-400">
                Already have an account?{' '}
                <Link to="/login?next=/pricing" className="text-indigo-600 hover:underline">
                  Log in and subscribe
                </Link>
              </p>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

function FormField({
  label,
  value,
  onChange,
  required,
  placeholder,
  type = 'text'
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  placeholder?: string;
  type?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <input
        type={type}
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
      />
    </div>
  );
}
