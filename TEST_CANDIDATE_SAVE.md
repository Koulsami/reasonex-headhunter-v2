# Testing Candidate Save Functionality

## What Was Fixed

**Problem:** Candidates added via "Add to Pipeline" disappeared after page refresh.

**Root Causes Identified:**
1. ✅ **FIXED (Commit 61ce3e6):** App.tsx used `forEach` without `await` - changed to `Promise.all()`
2. ✅ **FIXED (Commit e41bcd7):** apiService.ts silently swallowed errors - now throws errors properly

## How to Test

### Step 1: Check Railway Deployment
1. Go to [Railway Dashboard](https://railway.app/dashboard)
2. Click on your Backend service
3. Check **"Deployments"** tab
4. Wait for latest deployment to show "Success" (commit e41bcd7)
5. This may take 2-3 minutes

### Step 2: Test Adding Candidates
1. Open your app: https://reasonex-headhunter-v2-production.up.railway.app
2. Log in with Google
3. Go to **Search** tab
4. Enter a Job Description and search for candidates
5. Click **"Add to Pipeline"**
6. Watch browser console (F12 → Console tab)

**Expected Console Output:**
```
✓ Saved candidate: [Candidate Name]
✓ Saved candidate: [Candidate Name]
✓ Saved 5 candidates to database
```

**If You See Errors:**
```
Failed to save candidate: [Name] Error: Failed to save candidate: 500 ...
Warning: Some candidates may not have been saved to the database
```
This means the backend is having issues. Check Railway backend logs.

### Step 3: Verify Persistence
1. After adding candidates, **refresh the page** (F5)
2. Check if candidates are still visible in the Kanban board
3. Run the diagnostic script (see below)

### Step 4: Check Database Directly

**Option A: Run Check Script**
```bash
node backend/check-candidates.js
```

Expected output:
```
✓ Connected to database

📊 Total candidates in database: 5

✓ Recent candidates:
═══════════════════════════════════
1. Sarah Jenkins
   Role: Senior Product Manager at TechFlow Systems
   Stage: Identified | Match: 94% | Source: LinkedIn
   Assigned to: Sam Koul
   Added: 2026-01-07T...
```

**Option B: Check Railway PostgreSQL**
1. Go to Railway Dashboard
2. Click on PostgreSQL service
3. Click **"Query"** tab
4. Run:
```sql
SELECT
    COUNT(*) as total,
    MAX(added_at) as last_added
FROM candidates;
```

### Step 5: Check Audit Logs
```bash
node backend/check-audit-logs.js
```

Look for `UPSERT_CANDIDATE` events. If you see them, candidates were successfully saved.

## Troubleshooting

### Candidates Still Disappearing?

**Check 1: Is Railway Deployed?**
- Backend must be running latest code (commit e41bcd7)
- Frontend must be running latest code (commit e41bcd7)
- Check Railway "Deployments" tab for both services

**Check 2: Are You Logged In?**
- Open browser console (F12)
- Check localStorage: `localStorage.getItem('authToken')`
- Should NOT be null

**Check 3: Backend Connection**
- Check Railway backend logs for errors
- Look for "Failed to save candidate" messages
- Check if DATABASE_URL is configured

**Check 4: Database Issues?**
- Run `node backend/check-candidates.js`
- If it fails to connect, DATABASE_URL might be wrong
- See RAILWAY_DATABASE_CONNECTION_GUIDE.md

### Common Issues

**Issue:** "Failed to save candidate: 401 Unauthorized"
**Solution:** Token expired. Log out and log back in.

**Issue:** "Failed to save candidate: 500 Internal Server Error"
**Solution:** Check Railway backend logs. Likely database connection issue.

**Issue:** Console shows saves succeed but refresh loses data
**Solution:** Check if you're in "Demo Mode" (no backend connection). Backend might be offline.

**Issue:** No console messages at all
**Solution:** Clear browser cache and hard refresh (Ctrl+Shift+R)

## Expected Behavior After Fix

✅ Click "Add to Pipeline" → Console shows "Saved X candidates to database"
✅ Refresh page → Candidates still visible
✅ Check database → Candidates exist in PostgreSQL
✅ Check audit logs → UPSERT_CANDIDATE events logged
✅ If save fails → User sees alert warning

## Files Changed

1. **services/apiService.ts** (Commit e41bcd7)
   - Line 246-264: upsertCandidate() now throws errors properly

2. **App.tsx** (Commit 61ce3e6)
   - Line 107-113: Uses Promise.all() with try/catch

3. **backend/server.js**
   - Line 288-303: Endpoint already correct

## Next Steps If Still Broken

If candidates still disappear after all fixes:

1. **Clear Browser Cache:**
   - Press Ctrl+Shift+Delete
   - Clear "Cached images and files"
   - Hard refresh: Ctrl+Shift+R

2. **Check Network Tab:**
   - Open DevTools (F12)
   - Go to Network tab
   - Filter by "candidates"
   - Add candidates and watch for POST request
   - Check if request succeeds (200) or fails (4xx/5xx)

3. **Verify Environment Variables:**
   - Railway Frontend should have `VITE_BACKEND_URL=https://reasonex-headhunter-v2-backend-production.up.railway.app`
   - Railway Backend should have `DATABASE_URL` set

4. **Try Adding One Candidate Manually:**
   - Go to Kanban tab
   - Try manually moving a candidate
   - Check if that persists after refresh
   - If yes, problem is in "Add to Pipeline" flow
   - If no, problem is in save function

---

**Last Updated:** 2026-01-07
**Commits:** 61ce3e6 (Promise.all fix), e41bcd7 (error handling fix)
