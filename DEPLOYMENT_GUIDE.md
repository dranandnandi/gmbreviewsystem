# Deployment Guide: Bundle & AI Generation Fixes

## Overview
This deployment includes critical fixes for bundle preparation state management and AI review generation variation. Both frontend (Zustand store) and backend (Supabase Edge Function) require updates.

## Pre-Deployment Checklist

- [ ] Supabase CLI installed and authenticated
- [ ] Access to Supabase project dashboard
- [ ] `ALLGOOGLE_KEY` secret configured in Supabase
- [ ] Frontend build environment ready
- [ ] Backup current production state (optional)

## Deployment Steps

### Step 1: Deploy Edge Function (Backend)

**Important**: The edge function changes are in the workspace, so deploy from project root.

```powershell
# Navigate to project root
cd "c:\app folders\gmb review system\project"

# Login to Supabase (if not already)
npx supabase login

# Link to your project (if not already linked)
npx supabase link --project-ref YOUR_PROJECT_REF

# Deploy the generate-review-bundle function
npx supabase functions deploy generate-review-bundle --no-verify-jwt

# Verify deployment
npx supabase functions list
```

**Expected Output**:
```
Deploying function generate-review-bundle...
Function generate-review-bundle deployed successfully.
```

### Step 2: Verify Edge Function Deployment

1. Go to Supabase Dashboard → Functions
2. Find `generate-review-bundle`
3. Check "Last deployed" timestamp (should be recent)
4. Click "Logs" to see activity
5. Test invoke manually:

```powershell
# Test edge function with curl
$body = @{
  language = "en"
  flow = "ai3"
  context = @{
    patientName = "Test Patient"
    clinicName = "Test Clinic"
    clinicAddress = "123 Test St"
    gmbLink = "https://g.page/test"
    date = "2024-01-01"
    treatment = "Test Treatment"
    termsToKeep = @("Test Clinic")
  }
} | ConvertTo-Json

Invoke-WebRequest -Uri "https://YOUR_PROJECT_REF.supabase.co/functions/v1/generate-review-bundle" `
  -Method POST `
  -Headers @{"Content-Type"="application/json"} `
  -Body $body
```

**Expected Response**: JSON with `messages` array containing 3 strings.

### Step 3: Frontend Changes (No Build Required)

The frontend changes are in `src/store/useStore.ts`, which is client-side JavaScript. No build/deploy needed for:
- Local development (changes take effect on refresh)
- If using Vite dev server (hot reload automatic)

**For Production Netlify Deploy**:
```powershell
# Build frontend
npm run build

# Deploy to Netlify (if using Netlify CLI)
netlify deploy --prod

# Or push to main branch (if auto-deploy configured)
git add .
git commit -m "Fix bundle preparation validation and AI variation"
git push origin main
```

### Step 4: Verify Frontend Deployment

1. Open production URL (gmbreviewsystem.com)
2. Open browser console (F12)
3. Navigate to Reviews page
4. Test bundle preparation:
   - Click "Send Messages" on any review
   - Select language and AI flow
   - Watch console for validation logs
5. Verify button enables after bundle preparation

## Rollback Procedure

### If Edge Function Issues Occur:

```powershell
# Redeploy previous version (if you have backup)
cd "c:\app folders\gmb review system\bu\project"
npx supabase functions deploy generate-review-bundle --no-verify-jwt

# Or rollback to specific version in Supabase dashboard
# Functions → generate-review-bundle → Version History → Restore
```

### If Frontend Issues Occur:

```powershell
# Revert git commit
git revert HEAD
git push origin main

# Or restore from Netlify deploy history
# Netlify Dashboard → Deploys → [Previous Deploy] → Publish deploy
```

## Post-Deployment Verification

### 1. Edge Function Health Check

**Metrics to Monitor** (Supabase Dashboard → Functions → Metrics):
- Invocations: Should increase with usage
- Errors: Should remain near zero
- Duration: 2-7 seconds typical
- Memory: <128MB typical

**Check Logs** (Functions → Logs):
Look for errors like:
- ❌ "Gemini API error"
- ❌ "Missing ALLGOOGLE_KEY secret"
- ❌ "parse_failed"
- ❌ "language_mismatch"

### 2. Frontend Functionality Check

**Test Scenarios**:
1. ✅ Bundle preparation completes successfully
2. ✅ Button enables after bundle ready
3. ✅ Console shows validation logs
4. ✅ No JavaScript errors in console
5. ✅ Messages send to WhatsApp correctly

### 3. AI Variation Check

**Generate 10 Reviews** for same patient:
1. Check each review text is unique
2. Verify different tones used
3. Confirm treatment context appears
4. Ensure natural variation

**Use Test Script** (browser console):
```javascript
// Run after each bundle preparation
const msgs = JSON.parse(localStorage.getItem('gmb-review-store'))?.state?.bundleMessages?.messages;
console.log('Review:', msgs?.[1]);
window.__reviews = window.__reviews || [];
window.__reviews.push(msgs?.[1]);
console.log('Unique:', new Set(window.__reviews).size, '/', window.__reviews.length);
```

## Monitoring & Alerts

### Supabase Function Logs
Monitor for 24 hours after deployment:
- Check error rate (should be <1%)
- Monitor response times (should be <10s)
- Watch for rate limit errors (Gemini API)

### Frontend Console
Have users report:
- Any stuck loading states
- "Invalid response" errors
- Button remaining disabled

### User Feedback
Ask beta users to test:
- 20+ review generations
- Multiple languages (English, Hindi, Gujarati)
- Both ai3 and simple1 flows

## Configuration Updates

### If AI Generation Quality Issues:

Edit `supabase/functions/generate-review-bundle/index.ts`:

**Adjust Randomization Range**:
```typescript
// More variation (higher creativity)
const temperature = randomize ? 0.8 + Math.random() * 0.6 : 0.1; // 0.8-1.4

// Less variation (more consistency)
const temperature = randomize ? 0.6 + Math.random() * 0.3 : 0.1; // 0.6-0.9
```

**Adjust Tone Options**:
```typescript
const tones = [
  'professional and warm',
  'friendly and caring',
  'grateful and respectful',
  'appreciative and sincere',
  'enthusiastic and positive' // Add more
];
```

**Redeploy after changes**:
```powershell
npx supabase functions deploy generate-review-bundle --no-verify-jwt
```

### If Validation Too Strict:

Edit `src/store/useStore.ts` → `prepareLocalizedReviewBundle`:

**Relax Message Count Check**:
```typescript
// Current (strict)
if (data.messages.length !== expectedCount) {
  console.warn(`Expected ${expectedCount} messages, got ${data.messages.length}`);
}

// Relaxed (allow flexibility)
if (data.messages.length < 1) {
  throw new Error('No messages in response');
}
```

## Troubleshooting

### Issue: "Gemini API error 429"
**Cause**: Rate limit exceeded  
**Solution**: 
- Check Gemini API quota in Google Cloud Console
- Add retry logic with exponential backoff
- Consider upgrading API tier

### Issue: "parse_failed" in edge function
**Cause**: Gemini returned non-JSON response  
**Solution**:
- Check Gemini model compatibility (gemini-2.5-flash)
- Verify prompt format
- Check for safety filter blocking

### Issue: Reviews still too similar
**Cause**: Not enough variation in prompts  
**Solution**:
- Increase temperature range (0.8-1.5)
- Add more tone/style options (8-10 each)
- Include more context (doctor name, specialization)

### Issue: Wrong language script
**Cause**: Too many Latin terms in whitelist  
**Solution**:
- Reduce `COMMON_LATIN_GLOBAL` list
- Adjust `COMMON_LATIN_BY_LANG` for specific language

## Success Metrics

### Week 1 Post-Deployment
- [ ] 0 bundle preparation failures
- [ ] 100% button enable rate
- [ ] <1% edge function errors
- [ ] 20+ unique reviews generated per patient
- [ ] 0 user complaints about stuck states

### Week 2 Post-Deployment
- [ ] AI variation feedback positive (>80%)
- [ ] Review quality feedback positive (>80%)
- [ ] No performance degradation
- [ ] Edge function response time <5s average

## Contact & Support

**Issues**: Report in project GitHub issues  
**Edge Function Logs**: Supabase Dashboard → Functions → generate-review-bundle → Logs  
**Frontend Errors**: Browser Console → Network Tab  
**Performance**: Supabase Dashboard → Database → Performance

---

## Quick Reference Commands

```powershell
# Deploy edge function
npx supabase functions deploy generate-review-bundle --no-verify-jwt

# Check edge function logs
npx supabase functions logs generate-review-bundle

# Test edge function locally
npx supabase functions serve generate-review-bundle

# Build frontend
npm run build

# Deploy to Netlify
netlify deploy --prod

# Check Netlify logs
netlify logs

# Verify deployment
curl -X POST "https://YOUR_PROJECT_REF.supabase.co/functions/v1/generate-review-bundle" `
  -H "Content-Type: application/json" `
  -d '{"language":"en","flow":"ai3","context":{...}}'
```

---

**Deployment Date**: _________  
**Deployed By**: _________  
**Version**: 1.0.0 (Bundle & AI Fixes)
