# User Sync Webhook Setup Guide

## Overview

When a user is created in your system (Supabase auth), we need to sync their `auth_id` to the existing Neon database users table. This enables WhatsApp integration by mapping Supabase user IDs to Neon user IDs.

## Architecture

```
User Signup (Supabase)
    ↓
Webhook Trigger
    ↓
Netlify Function: webhook-sync-user
    ↓
Update auth_id in Neon users table
```

## Setup Options

### Option 1: Supabase Database Webhook (Recommended)

1. **Go to Supabase Dashboard**
   - Navigate to Database → Webhooks
   - Click "Create a new hook"

2. **Configure Webhook**
   ```
   Name: Sync User to Neon
   Table: auth.users (or public.users if that's where your users are)
   Events: INSERT
   Type: HTTP Request
   HTTP URL: https://gmbreviewsystem.com/.netlify/functions/webhook-sync-user
   Method: POST
   HTTP Headers:
     Content-Type: application/json
   ```

3. **Webhook Payload Template**
   ```json
   {
     "userId": "{{ record.id }}",
     "email": "{{ record.email }}",
     "fullName": "{{ record.raw_user_meta_data.full_name }}"
   }
   ```

### Option 2: Supabase Edge Function

1. **Deploy Edge Function**
   ```bash
   cd supabase/functions/sync-user-to-neon
   supabase functions deploy sync-user-to-neon
   ```

2. **Set up Database Webhook**
   - Go to Supabase Dashboard → Database → Webhooks
   - Point to your deployed edge function URL

### Option 3: Application-Level Sync (Simplest)

Update your user registration/login code to call the sync function:

**In your login/signup handler:**

```typescript
// After user is created/logged in
import { WhatsAppUserSyncService } from './services/whatsappUserSyncService';

// In LoginPage.tsx or after successful auth
try {
  await WhatsAppUserSyncService.syncCurrentUser();
  console.log('User synced to Neon database');
} catch (error) {
  console.error('Failed to sync user:', error);
  // Non-blocking - user can still proceed
}
```

This is the simplest approach and doesn't require any Supabase webhook configuration.

## Webhook Endpoint Details

**URL:** `https://gmbreviewsystem.com/.netlify/functions/webhook-sync-user`

**Method:** POST

**Headers:**
```
Content-Type: application/json
```

**Request Body:**
```json
{
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "email": "user@example.com",
  "fullName": "John Doe"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "User synced successfully",
  "userId": "3e1d877e-36b6-4ac4-b874-ba93c1eee1be",
  "auth_id": "550e8400-e29b-41d4-a716-446655440000",
  "email": "user@example.com",
  "updates": ["auth_id"]
}
```

**Error Response (404):**
```json
{
  "error": "User not found in database",
  "message": "User must be created in database first",
  "email": "user@example.com"
}
```

## How It Works

1. **User exists in Neon** with:
   - `id`: Neon UUID
   - `username`: user email
   - `auth_id`: NULL (initially)

2. **User signs up in Supabase**:
   - Supabase creates auth user with its own ID
   - Webhook triggers

3. **Webhook updates Neon**:
   - Looks up user by `username` (email)
   - Sets `auth_id` to Supabase user ID
   - Now user is linked between systems

4. **WhatsApp integration works**:
   - Frontend passes Supabase `userId` (auth_id)
   - Backend looks up Neon user by `auth_id`
   - Returns Neon user's `id` for WhatsApp backend

## Testing the Webhook

### Manual Test via Command Line

```powershell
# Test the webhook endpoint directly
$body = @{
    userId = "test-auth-id-123"
    email = "testsignup2@example.com"
    fullName = "Test User"
} | ConvertTo-Json

Invoke-WebRequest `
  -Uri "https://gmbreviewsystem.com/.netlify/functions/webhook-sync-user" `
  -Method POST `
  -ContentType "application/json" `
  -Body $body
```

### Expected Result

If user exists in Neon with email `testsignup2@example.com`:
```json
{
  "success": true,
  "message": "User synced successfully",
  "userId": "3e1d877e-36b6-4ac4-b874-ba93c1eee1be",
  "auth_id": "test-auth-id-123",
  "email": "testsignup2@example.com",
  "updates": ["auth_id"]
}
```

### Check Neon Database

```sql
-- Verify auth_id was updated
SELECT id, username, auth_id, name 
FROM users 
WHERE username = 'testsignup2@example.com';
```

Should show:
```
id: 3e1d877e-36b6-4ac4-b874-ba93c1eee1be
username: testsignup2@example.com
auth_id: test-auth-id-123
name: Test User
```

## Recommended: Option 3 (Application-Level)

Since you already have user creation logic in your app, the simplest approach is:

### 1. Update LoginPage.tsx

```typescript
import { WhatsAppUserSyncService } from '../services/whatsappUserSyncService';

// After successful login (after setUser call)
const handleLogin = async (credentials) => {
  try {
    // Your existing login logic
    const { data, error } = await supabase.auth.signInWithPassword(credentials);
    
    if (data.user) {
      setUser(data.user);
      
      // Sync to Neon database
      try {
        await WhatsAppUserSyncService.syncCurrentUser();
      } catch (syncError) {
        console.error('Failed to sync user to Neon:', syncError);
        // Non-blocking - user can proceed
      }
    }
  } catch (error) {
    // Handle login error
  }
};
```

### 2. Update SignupPage.tsx (if you have one)

Same pattern - call `WhatsAppUserSyncService.syncCurrentUser()` after successful signup.

## Current Status

- ✅ Webhook endpoint deployed: `/webhook-sync-user`
- ✅ User lookup updated to handle existing schema
- ✅ Handles both `auth_id` and `username` lookups
- ✅ Updates `auth_id` when user logs in
- ⏳ **Need to add sync call to login/signup flow**

## Next Steps

1. **Choose integration method** (Recommended: Option 3 - Application-Level)
2. **Update LoginPage.tsx** to call sync after login
3. **Test with existing user** (testsignup2@example.com)
4. **Verify auth_id updated** in Neon database
5. **Test WhatsApp integration** with synced user

## Troubleshooting

### "User not found in database"
- User doesn't exist in Neon users table
- Create user in Neon first, then sync

### "Failed to sync user"
- Check Netlify function logs
- Verify database connection string is correct
- Check if user exists in Neon by username

### auth_id not updating
- Check webhook is being called
- Verify email matches exactly
- Check Netlify function logs for errors
