# Testing Guide: Bundle Preparation & AI Generation Fixes

## Quick Verification Checklist

### ✅ Bundle Preparation State Fix
1. Open browser console (F12)
2. Navigate to Reviews page
3. Select a review and click "Send Messages"
4. Choose language and select "AI Thank You + Review + Link" flow
5. **Verify in console**:
   - "Starting bundle preparation for language: XX target: ai3"
   - "Invoking generate-review-bundle with body: {...}"
   - "Edge function response: {...}"
   - "Validated bundle with 3 messages"
   - "Bundle ready with 3 messages"
6. **Verify UI**:
   - Loading spinner appears briefly
   - "Send Message" button becomes enabled (not greyed out)
   - Button shows "Send: AI Thank You" (step 1 of 3)

### ✅ AI Generation Variation
1. Create 5-10 reviews for the **same patient** with same details
2. For each review, click "Send Messages" → choose English → AI flow
3. Wait for bundle preparation
4. **Verify in WhatsApp preview**:
   - Message 2 (AI review) is different each time
   - Different tones used (professional, friendly, grateful, etc.)
   - Different focus areas (treatment, staff, environment, efficiency)
   - No identical phrases repeated across generations

## Detailed Test Scenarios

### Scenario 1: Bundle Validation Success
**Steps**:
1. Create review with patient name, treatment, date
2. Click "Send Messages"
3. Select "English" or any language
4. Choose "AI Thank You + Review + Link"

**Expected Console Output**:
```
Starting bundle preparation for language: en target: ai3
Invoking generate-review-bundle with body: {language: "en", flow: "ai3", context: {...}}
Edge function response: {data: {language: "en", flow: "ai3", messages: [...3 items]}, error: null}
Validated bundle with 3 messages
Bundle ready with 3 messages
SendMessagesModal State: {bundleLoading: false, bundleReady: true, bundleError: false, ...}
```

**Expected UI**:
- Loading stops
- Button enabled
- Progress banner shows "Step 1 of 3"

### Scenario 2: Bundle Validation Failure (Error Handling)
**Steps**:
1. Temporarily break edge function (add `return null` in handler)
2. Try bundle preparation

**Expected Console Output**:
```
Failed to prepare bundle: Error: Invalid response from edge function: not an object
```

**Expected UI**:
- Error message displayed
- Button remains disabled
- Red error banner shown

### Scenario 3: AI Variation Testing (Detailed)
**Setup**:
- Create 10 reviews for "John Doe", treatment "MRI Scan", same date
- Same clinic details, same language (English)

**Test Each Review**:
| Review # | Tone Expected | Style Expected | Treatment Mentioned? | Notes Used? |
|----------|---------------|----------------|---------------------|-------------|
| 1 | Random | Random | ✓ | ✓ |
| 2 | Different from #1 | Different from #1 | ✓ | ✓ |
| 3 | Different from #1,2 | Different from #1,2 | ✓ | ✓ |
| ... | ... | ... | ✓ | ✓ |

**Validation Criteria**:
- No two reviews are identical (word-for-word)
- At least 3 different tones observed across 10 reviews
- At least 3 different focus styles observed
- Treatment name ("MRI Scan") appears in most reviews
- Review length varies (1-3 sentences)

### Scenario 4: Multi-Language Consistency
**Steps**:
1. Generate bundle in English (ai3 flow)
2. Verify 3 messages: greeting, review, link
3. Generate bundle in Hindi (ai3 flow)
4. Verify 3 messages with Hindi script (but English terms preserved)
5. Generate bundle in Gujarati (simple1 flow)
6. Verify 1 message with GMB link

**Expected Behavior**:
- English: All validation passes
- Hindi: Script validation passes, Latin words preserved
- Gujarati: Script validation passes, correct format

## Debug Logging Reference

### Key Log Messages

#### Bundle Preparation
```javascript
// Starting
"Starting bundle preparation for language: XX target: YY"

// Request sent
"Invoking generate-review-bundle with body: {...}"

// Response received
"Edge function response: {data: {...}, error: null}"

// Validation passed
"Validated bundle with N messages"
"Bundle ready with N messages"

// State updated
"SendMessagesModal State: {bundleLoading: false, bundleReady: true, ...}"
```

#### Validation Errors
```javascript
// Invalid response structure
"Invalid response structure: {...}"
"Error: Invalid response from edge function: not an object"

// Missing messages
"Error: Invalid response: expected messages array, got {...}"

// Wrong message count
"Expected 3 messages for ai3, got 1"
```

#### AI Generation (Edge Function)
```javascript
// In Supabase logs (supabase.com → Functions → Logs)
"Gemini API called with temperature: 0.85, topK: 45, topP: 0.92"
"Generated review with tone: friendly and caring"
"Generated review with style: emphasizing the professional care received"
```

## Performance Benchmarks

### Expected Timings
- Bundle preparation: 2-5 seconds (English)
- Bundle preparation: 3-7 seconds (Indian languages)
- WhatsApp tab opening: <1 second
- Total flow completion: 10-30 seconds (3 messages)

### Timeout Protection
- 10-second timeout configured in `startFlow()`
- Error shown if edge function doesn't respond in time
- Loading state guaranteed to clear (finally block)

## Common Issues & Solutions

### Issue: Button stays disabled
**Debug**:
1. Check console for "Bundle ready with N messages"
2. Check `bundleReady` flag in state log
3. Verify edge function response has valid `messages` array

**Solution**: Validation should catch and log the issue. Check edge function logs.

### Issue: "Invalid response" error
**Debug**:
1. Check edge function response in console
2. Look for malformed JSON or missing fields
3. Check Supabase function logs for generation errors

**Solution**: Edge function may have failed to generate. Check API key, model availability.

### Issue: Reviews still repetitive
**Debug**:
1. Check if edge function was redeployed
2. Verify `randomize: true` is passed in `generateOnce()`
3. Check Supabase logs for temperature values

**Solution**: Redeploy edge function with updated code.

### Issue: Wrong language script
**Debug**:
1. Check language code passed to edge function
2. Verify script validation passes
3. Check if Latin terms are too many (overwhelming native script)

**Solution**: Adjust `COMMON_LATIN_BY_LANG` in edge function.

## Manual Verification Script

Run this in browser console after bundle preparation:

```javascript
// Check state
const state = window.localStorage.getItem('gmb-review-store');
const parsed = JSON.parse(state);
console.log('Bundle Ready:', parsed?.state?.bundleReady);
console.log('Bundle Messages:', parsed?.state?.bundleMessages);

// Verify messages
const msgs = parsed?.state?.bundleMessages?.messages;
console.log('Message Count:', msgs?.length);
console.log('Message 1 Length:', msgs?.[0]?.length);
console.log('Message 2 (Review):', msgs?.[1]);
console.log('Message 3 (Link):', msgs?.[2]);

// Check uniqueness (run multiple times)
const review = msgs?.[1];
window.__reviewHistory = window.__reviewHistory || [];
window.__reviewHistory.push(review);
const unique = new Set(window.__reviewHistory);
console.log('Unique Reviews:', unique.size, '/', window.__reviewHistory.length);
```

## Success Criteria

### Bundle Preparation
- ✅ 100% of generations should set `bundleReady: true`
- ✅ 0% silent failures (all errors logged)
- ✅ Timeout protection prevents infinite loading
- ✅ Button enables within 5 seconds max

### AI Variation
- ✅ 0% identical reviews in 20+ generations
- ✅ 4+ different tones observed in 20 generations
- ✅ 4+ different styles observed in 20 generations
- ✅ Treatment context appears in 80%+ of reviews
- ✅ Notes context appears when provided

### User Experience
- ✅ No stuck loading states
- ✅ Clear error messages when failures occur
- ✅ Smooth flow through 3-step sequence
- ✅ WhatsApp tab reuse works correctly
- ✅ Reviews feel natural and authentic
