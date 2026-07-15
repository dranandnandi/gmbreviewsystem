import React, { useEffect, useState } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { CheckCircle, XCircle, AlertTriangle, ArrowRight, Loader2, Printer } from 'lucide-react';
import { useStore } from '../store/useStore';
import { supabase } from '../services/supabaseClient';

type PaymentStatus = 'success' | 'failure' | 'cancelled' | 'error' | 'loading';

interface ReceiptDetails {
  ccavenueOrderId: string | null;
  trackingId: string | null;
  bankRefNo: string | null;
  paymentMode: string | null;
  amount: number;
  currency: string;
  billingCycle: string;
  paidAt: string;
}

export function PaymentResultPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, setUser } = useStore();

  const [status, setStatus] = useState<PaymentStatus>('loading');
  const [message, setMessage] = useState('');
  const [planName, setPlanName] = useState('');
  const [receipt, setReceipt] = useState<ReceiptDetails | null>(null);

  useEffect(() => {
    const statusParam = searchParams.get('status') as PaymentStatus;
    const messageParam = searchParams.get('message');
    const planId = searchParams.get('plan_id');
    const orderId = searchParams.get('order_id');

    if (statusParam) {
      setStatus(statusParam);
      setMessage(messageParam || getDefaultMessage(statusParam));

      if (statusParam === 'success') {
        refreshUserData();
        if (planId) {
          fetchPlanName(planId);
        }
        if (orderId) {
          fetchReceipt(orderId);
        }
      }
    } else {
      setStatus('error');
      setMessage('Invalid payment response');
    }
  }, [searchParams]);

  async function fetchReceipt(orderId: string) {
    try {
      const [{ data: order }, { data: tx }] = await Promise.all([
        supabase
          .from('payment_orders')
          .select('ccavenue_order_id, amount, currency, billing_cycle')
          .eq('id', orderId)
          .single(),
        supabase
          .from('payment_transactions')
          .select('tracking_id, bank_ref_no, payment_mode, amount, created_at')
          .eq('order_id', orderId)
          .eq('order_status', 'Success')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()
      ]);

      if (order) {
        setReceipt({
          ccavenueOrderId: order.ccavenue_order_id,
          trackingId: tx?.tracking_id || null,
          bankRefNo: tx?.bank_ref_no || null,
          paymentMode: tx?.payment_mode || null,
          amount: tx?.amount ?? order.amount,
          currency: order.currency || 'INR',
          billingCycle: order.billing_cycle,
          paidAt: tx?.created_at || new Date().toISOString()
        });
      }
    } catch (err) {
      console.error('Error fetching receipt:', err);
    }
  }

  async function refreshUserData() {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) return;

      const { data: userData, error } = await supabase
        .from('users')
        .select(`
          id,
          name,
          role,
          clinic_name,
          clinic_address,
          gmb_link,
          logo,
          primary_color,
          secondary_color,
          contact_phone,
          contact_email,
          contact_whatsapp,
          google_sheet_id,
          google_apps_script_url,
          profile_types,
          languages,
          default_language,
          enabled_features,
          clinic_keywords,
          business_context
        `)
        .eq('auth_id', authUser.id)
        .single();

      if (!error && userData) {
        setUser({
          id: userData.id,
          name: userData.name,
          role: userData.role,
          clinicName: userData.clinic_name,
          clinicAddress: userData.clinic_address,
          gmbLink: userData.gmb_link,
          logo: userData.logo,
          primaryColor: userData.primary_color,
          secondaryColor: userData.secondary_color,
          contactPhone: userData.contact_phone,
          contactEmail: userData.contact_email,
          contactWhatsapp: userData.contact_whatsapp,
          googleSheetId: userData.google_sheet_id,
          googleAppsScriptUrl: userData.google_apps_script_url,
          profileTypes: userData.profile_types || [],
          languages: userData.languages,
          defaultLanguage: userData.default_language,
          enabledFeatures: userData.enabled_features || [],
          clinicKeywords: userData.clinic_keywords || '[]',
          businessContext: userData.business_context || null
        });
      }
    } catch (err) {
      console.error('Error refreshing user data:', err);
    }
  }

  async function fetchPlanName(planId: string) {
    try {
      const { data, error } = await supabase
        .from('saas_plans')
        .select('name')
        .eq('id', planId)
        .single();

      if (!error && data) {
        setPlanName(data.name);
      }
    } catch (err) {
      console.error('Error fetching plan name:', err);
    }
  }

  function getDefaultMessage(status: PaymentStatus): string {
    switch (status) {
      case 'success':
        return 'Your payment was successful!';
      case 'failure':
        return 'Payment failed. Please try again.';
      case 'cancelled':
        return 'Payment was cancelled.';
      case 'error':
        return 'An error occurred processing your payment.';
      default:
        return 'Processing...';
    }
  }

  const statusConfig = {
    success: {
      icon: CheckCircle,
      iconClass: 'text-green-500',
      bgClass: 'bg-green-50',
      borderClass: 'border-green-200',
      title: 'Payment Successful!',
      subtitle: planName ? `You're now subscribed to ${planName}` : 'Your subscription is now active'
    },
    failure: {
      icon: XCircle,
      iconClass: 'text-red-500',
      bgClass: 'bg-red-50',
      borderClass: 'border-red-200',
      title: 'Payment Failed',
      subtitle: 'Don\'t worry, you can try again'
    },
    cancelled: {
      icon: AlertTriangle,
      iconClass: 'text-yellow-500',
      bgClass: 'bg-yellow-50',
      borderClass: 'border-yellow-200',
      title: 'Payment Cancelled',
      subtitle: 'No charges were made'
    },
    error: {
      icon: XCircle,
      iconClass: 'text-red-500',
      bgClass: 'bg-red-50',
      borderClass: 'border-red-200',
      title: 'Error',
      subtitle: 'Something went wrong'
    },
    loading: {
      icon: Loader2,
      iconClass: 'text-indigo-500 animate-spin',
      bgClass: 'bg-indigo-50',
      borderClass: 'border-indigo-200',
      title: 'Processing',
      subtitle: 'Please wait...'
    }
  };

  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <div className="flex min-h-[60vh] items-center justify-center p-4">
      <div className={`w-full max-w-md rounded-xl border ${config.borderClass} ${config.bgClass} p-8 text-center`}>
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-white shadow-sm">
          <Icon className={`h-10 w-10 ${config.iconClass}`} />
        </div>

        <h1 className="text-2xl font-bold text-gray-900">{config.title}</h1>
        <p className="mt-2 text-gray-600">{config.subtitle}</p>

        {message && (
          <p className="mt-4 rounded-lg bg-white/50 p-3 text-sm text-gray-700">{message}</p>
        )}

        {status === 'success' && receipt && (
          <div className="mt-6 rounded-lg border border-gray-200 bg-white p-4 text-left print:border-0">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-900">Payment Receipt</h2>
              <button
                type="button"
                onClick={() => window.print()}
                className="flex items-center gap-1 text-xs text-indigo-600 hover:underline print:hidden"
              >
                <Printer className="h-3.5 w-3.5" />
                Print
              </button>
            </div>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-gray-500">Plan</dt>
                <dd className="font-medium text-gray-900">
                  {planName || 'Subscription'} ({receipt.billingCycle})
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-gray-500">Amount Paid</dt>
                <dd className="font-medium text-gray-900">
                  {new Intl.NumberFormat('en-IN', { style: 'currency', currency: receipt.currency }).format(receipt.amount)}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-gray-500">Order ID</dt>
                <dd className="font-mono text-xs text-gray-900">{receipt.ccavenueOrderId}</dd>
              </div>
              {receipt.trackingId && (
                <div className="flex justify-between gap-4">
                  <dt className="text-gray-500">Tracking ID</dt>
                  <dd className="font-mono text-xs text-gray-900">{receipt.trackingId}</dd>
                </div>
              )}
              {receipt.bankRefNo && (
                <div className="flex justify-between gap-4">
                  <dt className="text-gray-500">Bank Ref No</dt>
                  <dd className="font-mono text-xs text-gray-900">{receipt.bankRefNo}</dd>
                </div>
              )}
              {receipt.paymentMode && (
                <div className="flex justify-between gap-4">
                  <dt className="text-gray-500">Payment Mode</dt>
                  <dd className="text-gray-900">{receipt.paymentMode}</dd>
                </div>
              )}
              <div className="flex justify-between gap-4">
                <dt className="text-gray-500">Date</dt>
                <dd className="text-gray-900">{new Date(receipt.paidAt).toLocaleString('en-IN')}</dd>
              </div>
            </dl>
            <p className="mt-3 border-t border-gray-100 pt-2 text-xs text-gray-400">
              Keep this receipt for your records. Payment processed securely by CCAvenue.
            </p>
          </div>
        )}

        <div className="mt-8 space-y-3">
          {status === 'success' && user && (
            <>
              <Link
                to="/"
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-3 text-sm font-semibold text-white hover:bg-indigo-700"
              >
                Go to Dashboard
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/products"
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                View Products
              </Link>
            </>
          )}

          {status === 'success' && !user && (
            <>
              <p className="rounded-lg bg-indigo-50 p-3 text-sm text-indigo-800">
                Your account is active! Log in with the email and password you set during checkout.
              </p>
              <Link
                to="/login"
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-3 text-sm font-semibold text-white hover:bg-indigo-700"
              >
                Log in to your account
                <ArrowRight className="h-4 w-4" />
              </Link>
            </>
          )}

          {(status === 'failure' || status === 'error') && (
            <>
              <Link
                to="/pricing"
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-3 text-sm font-semibold text-white hover:bg-indigo-700"
              >
                Try Again
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/"
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                Go to Dashboard
              </Link>
            </>
          )}

          {status === 'cancelled' && (
            <>
              <Link
                to="/pricing"
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-3 text-sm font-semibold text-white hover:bg-indigo-700"
              >
                View Plans
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/"
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                Go to Dashboard
              </Link>
            </>
          )}
        </div>

        {status !== 'loading' && (
          <p className="mt-6 text-xs text-gray-500">
            Need help?{' '}
            <a href="mailto:support@yourdomain.com" className="text-indigo-600 hover:underline">
              Contact Support
            </a>
          </p>
        )}
      </div>
    </div>
  );
}
