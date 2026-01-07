# N8N Webhook Fix - Step by Step Guide

## Problem Summary

Your N8N webhook was configured in **TEST mode** instead of **PRODUCTION mode**. Test webhooks:
- Only work once after clicking "Execute workflow"
- Are not permanently registered
- Use `/webhook-test/` URL path

## What Was Fixed

✅ Updated `backend/schema.sql` line 88:
- Changed from: `/webhook-test/020ab1c4-1d07-4715-8262-d97193c421b5`
- Changed to: `/webhook/020ab1c4-1d07-4715-8262-d97193c421b5`

## Steps to Complete the Fix

### Step 1: Activate Your N8N Workflow

**CRITICAL**: You must do this first, otherwise the production webhook won't exist!

1. Go to https://n8n-production-3f14.up.railway.app
2. Open your LinkedIn search workflow
3. Click the **"Active"** toggle switch (top-right corner of the canvas)
4. The toggle should turn blue/green indicating it's active
5. This registers the production webhook permanently

### Step 2: Reset Your Database

Now update your Railway PostgreSQL database to use the new URL.

**Option A - Via Railway Dashboard** (Easiest):

1. Open your Railway project
2. Click on your PostgreSQL service
3. Go to the "Query" tab
4. Copy-paste this SQL:

```sql
-- Drop old tables
DROP TABLE IF EXISTS audit_log CASCADE;
DROP TABLE IF EXISTS candidates CASCADE;
DROP TABLE IF EXISTS jobs CASCADE;
DROP TABLE IF EXISTS clients CASCADE;
DROP TABLE IF EXISTS system_config CASCADE;
DROP TABLE IF EXISTS authorized_users CASCADE;
```

5. Click "Execute"
6. Then copy-paste the entire contents of `backend/schema.sql`
7. Click "Execute" again

**Option B - Via Command Line**:

```bash
# From your project root
psql YOUR_DATABASE_URL < backend/reset-database.sql
psql YOUR_DATABASE_URL < backend/schema.sql
```

### Step 3: Restart Your Backend

In Railway:
1. Go to your backend service
2. Click "Restart" or trigger a redeploy

### Step 4: Test the Webhook

1. Open your application in the browser
2. Go to the "Search" tab
3. Click "LinkedIn Search"
4. It should now work without 404 errors!

## How to Verify It's Working

✅ **N8N Dashboard**: Your workflow should show "Active" with a green indicator

✅ **Browser Console**: No more 404 errors about "webhook is not registered"

✅ **Railway Backend Logs**: Should show successful requests to N8N

✅ **Search Results**: You should receive candidate data back

## Troubleshooting

**Still getting 404 errors?**
- Check that the N8N workflow is ACTIVE (Step 1)
- Verify the database was reset (check system_config table)
- Clear your browser cache and hard refresh (Ctrl+Shift+R)

**Database connection errors?**
- Check your DATABASE_URL environment variable in Railway
- Make sure PostgreSQL service is running

**N8N workflow not activating?**
- Check for errors in the workflow nodes
- Verify all required credentials are configured

## Need to Update URL Without Resetting Database?

If you have important data you don't want to lose, run this instead:

```sql
UPDATE system_config
SET value = 'https://n8n-production-3f14.up.railway.app/webhook/020ab1c4-1d07-4715-8262-d97193c421b5'
WHERE key = 'linkedinApiUrl';
```

Then restart your backend service.
