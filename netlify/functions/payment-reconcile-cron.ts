/**
 * Scheduled payment reconciliation trigger
 *
 * Runs every 15 minutes and invokes the Supabase ccavenue-reconcile edge
 * function, which polls CCAvenue's Order Status API for pending orders
 * (covers users who paid but never returned via the redirect) and expires
 * stale orders/subscriptions.
 *
 * Required Netlify environment variables (Site settings -> Environment variables):
 * - SUPABASE_URL          e.g. https://iksfxkjnslttufpdklgq.supabase.co
 * - PAYMENT_CRON_SECRET   must match the CRON_SECRET set in Supabase edge function secrets
 */

import { schedule } from '@netlify/functions';

export const handler = schedule('*/15 * * * *', async () => {
  const supabaseUrl = process.env.SUPABASE_URL;
  const cronSecret = process.env.PAYMENT_CRON_SECRET;

  if (!supabaseUrl || !cronSecret) {
    console.error('payment-reconcile-cron: SUPABASE_URL or PAYMENT_CRON_SECRET not configured');
    return { statusCode: 500 };
  }

  try {
    const res = await fetch(`${supabaseUrl}/functions/v1/ccavenue-reconcile`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-cron-secret': cronSecret
      },
      body: '{}'
    });

    const result = await res.text();
    console.log(`payment-reconcile-cron: status=${res.status} body=${result.substring(0, 500)}`);
    return { statusCode: res.ok ? 200 : 502 };
  } catch (err) {
    console.error('payment-reconcile-cron failed:', err);
    return { statusCode: 500 };
  }
});
