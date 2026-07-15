# CCAvenue Payment Integration — Setup Guide

End-to-end flow: **Pricing page → CCAvenue hosted payment page → callback → subscription auto-activated → receipt shown**. A reconciliation cron catches payments where the user never returned to the site, and expiry crons handle stale orders and lapsed subscriptions.

---

## 1. What you need from CCAvenue (3 values)

Log in to the CCAvenue merchant dashboard (M.A.R.S) at https://login.ccavenue.com and collect:

| Value | Where in the CCAvenue dashboard |
|---|---|
| **Merchant ID** | Shown at the top after login (numeric, e.g. `123456`) |
| **Access Code** | Settings → API Keys (e.g. `AVXX00XX00XX00XXXX`) |
| **Working Key** | Settings → API Keys (32-char hex string) — this encrypts/decrypts all requests |

> **IMPORTANT — keys are per registered URL.** Access Code and Working Key only work for the exact URL they were registered for. This app runs at **`https://gmbreviewsystem.com`**, so you need a key pair registered for that URL. If your existing pairs were registered for a different site (e.g. `limsapp.in`), add `https://gmbreviewsystem.com` as a **new registered URL** on the same merchant account (Settings → API Keys, or ask your CCAvenue account manager) — CCAvenue will issue a fresh Access Code + Working Key for it. Same Merchant ID, new pair.

Also do this in the CCAvenue dashboard:
- **Enable the "Order Status Tracker" API** if it's not already active (needed for reconciliation). It's under the same API section; contact CCAvenue support if you don't see it.

## 2. Your URLs (already fixed by this project)

- **Callback URL (redirect + cancel — same URL for both):**
  `https://gmbreviewsystem.com/api/ccavenue-callback`
  (netlify.toml proxies this to the Supabase `ccavenue-callback` function, so CCAvenue only ever sees your registered domain)
- **Frontend URL:** `https://gmbreviewsystem.com`

## 3. Where to set environment variables

### A. Supabase Edge Function secrets ← most of them go HERE

Set via CLI (from the `project/` folder):

```bash
supabase secrets set CCAVENUE_MERCHANT_ID=<your merchant ID>
supabase secrets set CCAVENUE_ACCESS_CODE=<access code registered for gmbreviewsystem.com>
supabase secrets set CCAVENUE_WORKING_KEY=<working key registered for gmbreviewsystem.com>
supabase secrets set CCAVENUE_REDIRECT_URL=https://gmbreviewsystem.com/api/ccavenue-callback
supabase secrets set CCAVENUE_CANCEL_URL=https://gmbreviewsystem.com/api/ccavenue-callback
supabase secrets set FRONTEND_URL=https://gmbreviewsystem.com
supabase secrets set CRON_SECRET=<generate a long random string>
# TEST mode only (omit both in production — production URLs are the defaults):
supabase secrets set CCAVENUE_PAYMENT_URL=https://test.ccavenue.com/transaction/transaction.do?command=initiateTransaction
supabase secrets set CCAVENUE_STATUS_API_URL=https://apitest.ccavenue.com/apis/servlet/DoWebTrans
```

Or via dashboard: **supabase.com → your project → Edge Functions → Secrets → Add new secret** (same names/values).

Generate `CRON_SECRET` with e.g.: `openssl rand -hex 32` (Git Bash) — any long random string works.

`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` are injected automatically by Supabase; don't set them.

### B. Netlify environment variables (for the reconcile cron)

**Netlify dashboard → your site → Site configuration → Environment variables:**

| Name | Value |
|---|---|
| `SUPABASE_URL` | `https://iksfxkjnslttufpdklgq.supabase.co` |
| `PAYMENT_CRON_SECRET` | the exact same value as `CRON_SECRET` above |

### C. Frontend `.env` — no changes needed

`VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` are already set; the frontend never sees CCAvenue keys.

## 4. Deploy

```bash
# Apply DB migrations (payment tables + hardening/expiry functions)
supabase db push

# Deploy the four edge functions (config.toml handles verify_jwt per function)
supabase functions deploy ccavenue-initiate
supabase functions deploy ccavenue-guest-checkout
supabase functions deploy ccavenue-callback --no-verify-jwt
supabase functions deploy ccavenue-reconcile --no-verify-jwt

# Frontend + reconcile cron deploy with your normal Netlify deploy (git push)
```

> `--no-verify-jwt` on callback/reconcile is required: CCAvenue's servers and the cron caller don't carry a Supabase JWT. The callback is safe because it only trusts data it can decrypt with the Working Key; reconcile is protected by `CRON_SECRET`.

## 5. Test the flow

1. Open `/pricing`, log in, click **Subscribe** on a plan.
2. You should land on the CCAvenue (test) payment page. Pay with CCAvenue's test card details (provided with your test account).
3. You should be redirected to `/payment/result` showing **Payment Successful** + a receipt.
4. Verify in Supabase: `payment_orders.status = 'completed'`, a `payment_transactions` row exists, `user_subscriptions` is active, and the user's `enabled_features` now matches the plan.
5. Test reconciliation manually:
   ```bash
   curl -X POST https://iksfxkjnslttufpdklgq.supabase.co/functions/v1/ccavenue-reconcile \
     -H "x-cron-secret: <your CRON_SECRET>" -H "Content-Type: application/json" -d "{}"
   ```
6. Abandon a payment (close the tab on the CCAvenue page) → order stays `pending` → after 30 min the expiry cron marks it `expired` (or reconcile resolves it if it was actually paid).

## 6. How the pieces fit

| Piece | File | Role |
|---|---|---|
| Initiate | `supabase/functions/ccavenue-initiate/` | Auth user, price the plan server-side, create `payment_orders` row, return encrypted payload |
| Redirect | `src/services/paymentService.ts` | Auto-submits POST form to CCAvenue |
| Callback | `supabase/functions/ccavenue-callback/` | Decrypts response, verifies amount, replay-safe, records `payment_transactions`, redirects to `/payment/result` |
| Activation | DB trigger `activate_subscription_on_payment` | On Success: completes order, upserts `user_subscriptions`, syncs `users.enabled_features` (renew-before-expiry extends from period end) |
| Reconcile | `supabase/functions/ccavenue-reconcile/` + `netlify/functions/payment-reconcile-cron.ts` | Every 15 min: Order Status API check for pending orders; expires stale orders + lapsed subscriptions |
| Expiry | `expire_pending_payment_orders()` / `expire_overdue_subscriptions()` | pg_cron (if enabled) and the reconcile run both call these; lapsed CCAvenue subscriptions go `past_due` after a 3-day grace and features drop to dashboard-only |
| Result + receipt | `src/pages/PaymentResultPage.tsx` | Success/failure UI, refreshes features, printable receipt |

## 7. Guest checkout (ad landing pages — pay first, account auto-created)

Two ways to sell to visitors who have no account yet:

**A. On this app (any domain it's served from):** send ad traffic to `/buy/<plan_id>` (e.g. `/buy/smart_reports`, add `?cycle=yearly` to preselect yearly). The page collects business details + a password, creates the account with **no features**, sends the buyer to CCAvenue, and the payment callback activates the plan. Failed/abandoned payments leave a feature-less account the buyer can log into and pay from `/pricing`.

**B. On an external static site (e.g. limsapp.in):** use [docs/limsapp-checkout-template.html](docs/limsapp-checkout-template.html) — a self-contained checkout page with setup instructions in its header comment. Payment then *originates* from that domain, so the CCAvenue keys and `CCAVENUE_REDIRECT_URL`/`CANCEL_URL` secrets must belong to **that** domain (the whole system runs on one registered domain's key pair at a time; switching domains = swapping those 4 secret values).

## 8. Going live checklist

- [ ] Swap to production Merchant ID / Access Code / Working Key
- [ ] Remove `CCAVENUE_PAYMENT_URL` and `CCAVENUE_STATUS_API_URL` secrets (defaults are production)
- [ ] Callback URL registered with CCAvenue for the **production** keys
- [ ] `FRONTEND_URL` points at the real domain
- [ ] Run one small real transaction end-to-end and refund it via the CCAvenue dashboard
- [ ] Update the support email on `/payment/result` (currently `support@yourdomain.com`)
