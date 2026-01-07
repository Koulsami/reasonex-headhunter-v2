# 🚨 URGENT: Candidate Save Debugging Guide

## Current Status

✅ **Database:** All tables exist and are healthy
✅ **Jobs:** 5 jobs saved successfully (UPSERT_JOB events in audit log)
❌ **Candidates:** 0 candidates in database
❌ **Audit Logs:** NO `UPSERT_CANDIDATE` events (candidates never reached backend)

## Critical Finding

**Jobs are saving, but candidates are NOT.**

This means:
- The `Promise.all()` fix is NOT being executed
- Or the API calls are failing before reaching the backend
- Or Railway hasn't deployed the latest code yet

## Step 1: Check Railway Deployment Status

### Backend Deployment
1. Go to https://railway.app/dashboard
2. Click on **Backend service**
3. Check **"Deployments"** tab
4. **Latest commit should be:** `e41bcd7` - "Fix candidate persistence: Stop silently swallowing save errors"
5. **Status should be:** ✓ Success (green)

**If deployment is still running:** Wait 2-3 minutes

**If latest deployment is NOT e41bcd7:** Railway may not have picked up the changes
- Click "Deploy" → "Redeploy" to force redeploy

### Frontend Deployment
1. Go to https://railway.app/dashboard
2. Click on **Frontend service**
3. Check **"Deployments"** tab
4. **Latest commit should be:** `e41bcd7` or later
5. **Status should be:** ✓ Success (green)

## Step 2: Get Railway Backend Logs

**Critical: We need to see what happens when you click "Add to Pipeline"**

### How to Get Logs:

1. Go to Railway Dashboard
2. Click on **Backend service**
3. Click **"Logs"** tab (or "Deployments" → Latest → "View Logs")
4. **Clear current logs** (there's usually a "Clear" button)
5. **Go to your app** and try adding candidates:
   - Search for candidates
   - Click "Add to Pipeline"
   - Wait 5 seconds
6. **Go back to Railway logs**
7. **Copy ALL logs** from the last 30 seconds

### What to Look For in Logs:

**Expected logs when candidates are saved:**
```
=== LINKEDIN SEARCH REQUEST START ===
...
=== LINKEDIN SEARCH REQUEST SUCCESS ===

POST /api/candidates (first candidate)
POST /api/candidates (second candidate)
POST /api/candidates (third candidate)
```

**If you DON'T see `/api/candidates` requests:**
- Frontend is NOT calling the backend to save candidates
- This means the fix didn't deploy or browser cache issue

**If you see `/api/candidates` requests with errors:**
- Look for error messages (400, 401, 500 status codes)
- Copy the full error message

## Step 3: Check Browser Console

**While adding candidates, watch the browser console:**

1. Open your app
2. Press **F12** to open DevTools
3. Go to **Console** tab
4. **Clear console** (trash icon)
5. Try adding candidates via "Add to Pipeline"
6. **Look for these messages:**

**Expected (Working):**
```
[Frontend] Calling backend LinkedIn search API: ...
[Frontend] Backend response received successfully
✓ Saved candidate: [Name]
✓ Saved candidate: [Name]
✓ Saved 5 candidates to database
```

**Error Scenarios:**

**Scenario A: No save messages at all**
```
[Frontend] Calling backend LinkedIn search API: ...
[Frontend] Backend response received successfully
(nothing else - no "Saved candidate" messages)
```
**Diagnosis:** Frontend code didn't deploy or browser cache issue
**Solution:** Hard refresh (Ctrl+Shift+R) or clear browser cache

**Scenario B: Error messages**
```
Failed to save candidate: [Name] Error: ...
Warning: Some candidates may not have been saved to the database
```
**Diagnosis:** Backend is rejecting the save requests
**Solution:** Check Railway backend logs for the actual error

**Scenario C: Network errors**
```
Failed to save candidate: [Name] TypeError: Failed to fetch
```
**Diagnosis:** Backend is down or CORS issue
**Solution:** Check Railway backend is running

## Step 4: Check Network Tab

1. Open DevTools (F12)
2. Go to **Network** tab
3. **Clear network log**
4. Add candidates via "Add to Pipeline"
5. **Filter by:** `candidates`
6. **Look for:** Multiple POST requests to `/api/candidates`

**Check each POST request:**
- **Status:** Should be **200 OK** (green)
- **If 401:** Authentication issue (token expired, log out/in)
- **If 500:** Backend error (check Railway logs)
- **If 0 or failed:** Backend is down

**Click on each request:**
- **Headers tab:** Check `Authorization: Bearer ...` header exists
- **Payload tab:** Check candidate data is being sent
- **Response tab:** Should see `{"success": true}`

## Step 5: Verify Code Deployed

**Check if the fix is actually in production:**

1. Go to your app
2. Open DevTools Console
3. Paste this code and press Enter:
```javascript
localStorage.getItem('authToken') ? 'Token exists' : 'No token'
```

Should show: `"Token exists"` or the actual token value

4. Then paste this to check if the frontend code has the fix:
```javascript
fetch.toString().includes('Promise.all') ? 'Fix deployed' : 'Old code'
```

## Common Issues and Solutions

### Issue 1: "Old code still running"
**Symptoms:** No "Saved candidate" console messages
**Solutions:**
1. Hard refresh: Ctrl+Shift+R
2. Clear browser cache completely
3. Try incognito mode
4. Check Railway frontend deployment

### Issue 2: "401 Unauthorized"
**Symptoms:** Network tab shows 401 errors
**Solutions:**
1. Log out and log back in
2. Clear localStorage and refresh
3. Check token in console: `localStorage.getItem('authToken')`

### Issue 3: "500 Internal Server Error"
**Symptoms:** Network tab shows 500 errors
**Solutions:**
1. Check Railway backend logs (Step 2)
2. Likely database connection issue
3. Check if DATABASE_URL is set in Railway

### Issue 4: "Request blocked by CORS"
**Symptoms:** Console shows CORS error
**Solutions:**
1. Check VITE_BACKEND_URL in Railway frontend env vars
2. Should be: `https://reasonex-headhunter-v2-backend-production.up.railway.app`
3. Redeploy frontend if needed

## What to Send Me

**If candidates still don't save, please provide:**

1. **Railway Backend Logs** (from Step 2)
   - Copy the logs from when you clicked "Add to Pipeline"

2. **Browser Console Output** (from Step 3)
   - Copy all messages from when you clicked "Add to Pipeline"

3. **Network Tab Screenshot** (from Step 4)
   - Filter by "candidates"
   - Show all POST requests to `/api/candidates`
   - Show the status codes

4. **Deployment Status:**
   - Backend latest commit hash
   - Frontend latest commit hash
   - Both deployment statuses

With these 4 pieces of information, I can pinpoint exactly what's wrong.

## Quick Verification Commands

Run these to verify current state:

```bash
# Check database state
node backend/check-candidates.js
node backend/check-audit-logs.js

# Test database save functionality
node backend/test-candidate-save.js

# Verify system configuration
node backend/check-config.js
```

All these should work. The issue is frontend → backend communication.

---

**Created:** 2026-01-07
**Last Commit:** e41bcd7 (Fix candidate persistence)
