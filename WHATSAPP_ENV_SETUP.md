# WhatsApp Integration - Environment Variables

This document lists the required environment variables for the WhatsApp backend integration.

## Required Environment Variables

Add these to your Netlify environment variables (Site Settings → Environment Variables):

### WhatsApp Backend Configuration

```bash
# WhatsApp Backend API Base URL
WHATSAPP_API_BASE_URL=https://lionfish-app-nmodi.ondigitalocean.app

# WhatsApp Backend API Key
WHATSAPP_API_KEY=whatsapp-lims-secure-api-key-2024

# PostgreSQL Connection String (Neon Database)
# Format: postgresql://username:password@host/database?sslmode=require
WHATSAPP_DB_CONNECTION_STRING=postgresql://[username]:[password]@[neon-host]/[database]?sslmode=require
```

## How to Set Environment Variables in Netlify

1. Go to your Netlify site dashboard
2. Navigate to **Site Settings** → **Environment Variables**
3. Click **Add a variable**
4. Add each variable name and value from above
5. Save changes
6. **Important:** Redeploy your site for changes to take effect

## Local Development

For local development, create a `.env` file in the project root:

```bash
WHATSAPP_API_BASE_URL=https://lionfish-app-nmodi.ondigitalocean.app
WHATSAPP_API_KEY=whatsapp-lims-secure-api-key-2024
WHATSAPP_DB_CONNECTION_STRING=postgresql://[username]:[password]@[neon-host]/[database]?sslmode=require
```

**Note:** Never commit `.env` to version control. It's already in `.gitignore`.

## Database Schema

The PostgreSQL database should have the following `users` table:

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_id TEXT UNIQUE NOT NULL,  -- Maps to OPD system user ID
  username TEXT NOT NULL,         -- User email
  full_name TEXT NOT NULL,        -- User full name
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_users_auth_id ON users(auth_id);
```

## Testing

After setting environment variables, test the integration:

1. Open the Settings page in your application
2. Navigate to WhatsApp Connection section
3. Click "Generate QR Code"
4. Scan with WhatsApp on your phone
5. Send a test message

## Troubleshooting

### "User not found in WhatsApp backend"
- User hasn't been synced to the backend database
- Try logging out and logging back in (triggers auto-sync)
- Or use the manual sync button in Settings

### "Failed to connect to WhatsApp backend"
- Check that `WHATSAPP_API_BASE_URL` is correct
- Verify `WHATSAPP_API_KEY` matches backend configuration
- Ensure backend service is running

### "Database connection failed"
- Verify `WHATSAPP_DB_CONNECTION_STRING` is correct
- Ensure database is accessible from Netlify Functions
- Check that SSL mode is configured properly

## Security Notes

- Never expose API keys in client-side code
- All WhatsApp API calls go through Netlify Functions (server-side)
- API key is stored securely in environment variables
- Database connection pooling prevents connection exhaustion
