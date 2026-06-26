# ✅ Netlify Setup Complete - Quick Reference

## Environment Variables Status

### ✅ Set in Netlify (via CLI)
- `WHATSAPP_API_BASE_URL` = https://lionfish-app-nmodi.ondigitalocean.app
- `WHATSAPP_API_KEY` = whatsapp-lims-secure-api-key-2024
- `NODE_VERSION` = 18

### ⚠️ TODO: Set Database Connection
You need to set the PostgreSQL connection string:

```powershell
netlify env:set WHATSAPP_DB_CONNECTION_STRING "postgresql://username:password@your-neon-host/database?sslmode=require"
```

**Get your connection string from:**
- Neon Dashboard: https://console.neon.tech/
- Navigate to your project → Connection Details
- Copy the connection string

## Netlify Functions Status

✅ **12 Functions Detected:**
1. sync-user-to-whatsapp-db
2. whatsapp-connect
3. whatsapp-disconnect
4. whatsapp-proxy
5. whatsapp-qr
6. whatsapp-send-document
7. whatsapp-send-file-url
8. whatsapp-send-message ⭐ (core for reviews)
9. whatsapp-send-report
10. whatsapp-send-report-url
11. whatsapp-status
12. whatsapp-sync-user

## Configuration Files

✅ **netlify.toml** - Updated with:
```toml
[functions]
  directory = "netlify/functions"
  node_bundler = "esbuild"
  included_files = ["netlify/functions/**/*.ts"]
```

## Quick Commands Reference

### View all environment variables
```powershell
netlify env:list
```

### Set an environment variable
```powershell
netlify env:set KEY "value"
```

### Deploy to production
```powershell
netlify deploy --prod
```

### Deploy to preview
```powershell
netlify deploy
```

### View function logs
```powershell
netlify functions:invoke whatsapp-status --payload '{"userId":"test"}'
```

### Open Netlify dashboard
```powershell
netlify open
```

## Next Steps

### 1. Set Database Connection String
```powershell
# Get from Neon dashboard, then run:
netlify env:set WHATSAPP_DB_CONNECTION_STRING "postgresql://..."
```

### 2. Create Database Table
Connect to your Neon database and run:
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_id TEXT UNIQUE NOT NULL,
  username TEXT NOT NULL,
  full_name TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_users_auth_id ON users(auth_id);
```

### 3. Build and Deploy
```powershell
# Build locally first to check for errors
npm run build

# Deploy to production
netlify deploy --prod
```

### 4. Test Functions
After deployment:
```powershell
# Test status endpoint
netlify functions:invoke whatsapp-status --payload '{"userId":"your-user-id"}'
```

## Verify Deployment

1. **Check Functions in Dashboard:**
   ```powershell
   netlify open
   ```
   Navigate to: Functions tab

2. **Check Environment Variables:**
   ```powershell
   netlify env:list
   ```
   Should show all 3 variables

3. **Test Live Site:**
   - Open deployed URL
   - Go to Settings → WhatsApp Connection
   - Click "Generate QR Code"
   - Should work if DB connection is set

## Troubleshooting

### Functions not deploying
```powershell
# Check build logs
netlify build

# Check for TypeScript errors
npm run build
```

### Environment variables not working
```powershell
# Verify they're set
netlify env:list

# Re-deploy after setting variables
netlify deploy --prod
```

### Database connection fails
- Verify connection string format
- Check SSL mode is included: `?sslmode=require`
- Ensure Neon database is active
- Check IP whitelist in Neon (should allow all for Netlify)

## Local Development

### Run functions locally
```powershell
netlify dev
```

This starts:
- Local dev server on http://localhost:8888
- Functions available at http://localhost:8888/.netlify/functions/*

### Test local function
```powershell
# In another terminal
curl http://localhost:8888/.netlify/functions/whatsapp-status?userId=test
```

## Resources

- **Netlify Docs**: https://docs.netlify.com/
- **Netlify Functions**: https://docs.netlify.com/functions/overview/
- **Environment Variables**: https://docs.netlify.com/environment-variables/overview/
- **Neon PostgreSQL**: https://neon.tech/docs

## Status Summary

✅ Netlify CLI installed
✅ Logged in to Netlify
✅ Project linked
✅ 2/3 environment variables set
⚠️  Database connection string needed
✅ 12 functions detected
✅ netlify.toml configured
⏳ Ready to deploy after DB connection is set
