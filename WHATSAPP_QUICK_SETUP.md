# WhatsApp Integration - Quick Setup Guide

## ⚡ 5-Minute Setup

### Step 1: Install Dependencies ✅
```bash
npm install @netlify/functions pg qrcode
npm install --save-dev @types/pg @types/qrcode
```
**Status:** ✅ Already installed

### Step 2: Set Environment Variables

Go to **Netlify Dashboard** → **Site Settings** → **Environment Variables**

Add these 3 variables:

```
WHATSAPP_API_BASE_URL = https://lionfish-app-nmodi.ondigitalocean.app
WHATSAPP_API_KEY = whatsapp-lims-secure-api-key-2024
WHATSAPP_DB_CONNECTION_STRING = postgresql://[username]:[password]@[neon-host]/[database]?sslmode=require
```

### Step 3: Database Setup

Run this SQL on your Neon PostgreSQL database:

```sql
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_id TEXT UNIQUE NOT NULL,
  username TEXT NOT NULL,
  full_name TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_auth_id ON users(auth_id);
```

### Step 4: Deploy to Netlify

```bash
git add .
git commit -m "Add WhatsApp backend integration"
git push
```

Wait for Netlify to deploy (2-3 minutes).

### Step 5: Connect WhatsApp

1. Open your deployed app
2. Go to **Settings** page
3. Find **WhatsApp Connection** section
4. Click **"Generate QR Code"**
5. Scan with WhatsApp on your phone
6. Wait for "Connected" status

### Step 6: Test Integration

1. Go to **Reviews** page
2. Click **Send Messages** on any review
3. You should see:
   - Green banner: "Auto-Send Mode (WhatsApp Connected)"
   - Toggle switch to enable auto-send
4. Enable auto-send and test a message

## ✅ Verification Checklist

- [ ] Environment variables set in Netlify
- [ ] Netlify deployed successfully
- [ ] Database table created
- [ ] WhatsApp connected (green status)
- [ ] Auto-send toggle visible in Send Messages modal
- [ ] Test message sent successfully

## 🎯 Key Features

### Auto-Send Mode
- **Enabled:** Messages sent directly via backend API (no browser tab)
- **Disabled:** Opens WhatsApp Web with pre-filled message (original behavior)

### Connection Status
- Real-time status check on modal open
- Auto-fallback to manual mode if disconnected
- Connection management in Settings page

### User Sync
- Automatic sync on login (recommended to implement)
- Manual sync button in Settings
- Maps OPD user ID to WhatsApp backend UUID

## 📁 Files Created

### Frontend
- `src/services/whatsappApi.ts` - API client
- `src/services/whatsappUserSyncService.ts` - User sync
- `src/components/WhatsApp/WhatsAppConnectionCard.tsx` - Connection UI

### Backend (Netlify Functions)
- `netlify/functions/_shared/whatsappClient.ts` - Shared utilities
- `netlify/functions/_shared/userLookup.ts` - Database lookup
- `netlify/functions/whatsapp-*.ts` - 12 API endpoints

### Documentation
- `WHATSAPP_ENV_SETUP.md` - Detailed environment setup
- `WHATSAPP_INTEGRATION_SUMMARY.md` - Complete implementation guide
- `WHATSAPP_QUICK_SETUP.md` - This file

## 🔧 Next Steps (Optional Enhancements)

### 1. Add to Settings Page

```typescript
// In src/pages/SettingsPage.tsx
import { WhatsAppConnectionCard } from '../components/WhatsApp/WhatsAppConnectionCard';

// Add new section:
<section>
  <h2 className="text-xl font-semibold mb-4">WhatsApp Integration</h2>
  <WhatsAppConnectionCard />
</section>
```

### 2. Auto-Sync on Login

```typescript
// In src/pages/LoginPage.tsx
import { WhatsAppUserSyncService } from '../services/whatsappUserSyncService';

// After successful login (after setUser):
await WhatsAppUserSyncService.syncCurrentUser();
```

### 3. Bulk Sending

Modify SendMessagesModal to:
- Allow selecting multiple reviews
- Send messages in sequence with delay
- Show progress indicator

## 🐛 Troubleshooting

### "User not found in WhatsApp backend"
**Fix:** Log out and log back in (triggers auto-sync)

### Auto-send toggle not visible
**Fix:** Check WhatsApp connection status is "Connected"

### Messages not sending automatically
**Fix:** 
1. Verify environment variables are set
2. Check Netlify Function logs
3. Test connection in Settings page

### QR code not generating
**Fix:**
1. Check `WHATSAPP_API_BASE_URL` is correct
2. Verify `WHATSAPP_API_KEY` matches backend
3. Check Netlify Function logs for errors

## 📊 Architecture Overview

```
┌─────────────────┐
│   React App     │
│  (Frontend)     │
└────────┬────────┘
         │
         ↓
┌─────────────────┐
│  whatsappApi    │
│    (Client)     │
└────────┬────────┘
         │
         ↓
┌─────────────────┐
│ Netlify Funcs   │
│  (Proxy Layer)  │
└────────┬────────┘
         │
         ↓
┌─────────────────┐
│  DigitalOcean   │
│ WhatsApp Backend│
└────────┬────────┘
         │
         ↓
┌─────────────────┐
│  PostgreSQL     │
│  (Neon DB)      │
└─────────────────┘
```

## 🎉 Success!

Once all steps are complete, you'll have:

✅ WhatsApp backend integration
✅ Auto-send mode for messages
✅ Connection management UI
✅ User synchronization
✅ Fallback to manual mode
✅ Complete error handling

## 📞 Support

Need help? Check:
1. `WHATSAPP_ENV_SETUP.md` - Environment setup details
2. `WHATSAPP_INTEGRATION_SUMMARY.md` - Complete documentation
3. Netlify Function logs - Runtime errors
4. Browser console - Frontend errors
