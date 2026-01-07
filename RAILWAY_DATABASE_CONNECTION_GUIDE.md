# Railway Database Connection Guide

## Problem
Your backend is trying to connect to PostgreSQL but failing with:
```
getaddrinfo ENOTFOUND postgres.railway.internal
```

This means the backend doesn't have the `DATABASE_URL` environment variable configured.

## Solution: Connect Backend to Database

### Step 1: Get Your Database Connection String

1. Go to [Railway Dashboard](https://railway.app/dashboard)
2. Click on your project
3. You should see **3 services**:
   - Frontend (Railway)
   - Backend (Node.js)
   - PostgreSQL (Database)

4. **Click on the PostgreSQL service**
5. Click on the **"Connect"** tab (or **"Variables"** tab)
6. Look for **"DATABASE_URL"** or **"Postgres Connection URL"**
7. Click the **Copy** button next to it
   - It looks like: `postgresql://postgres:PASSWORD@containers-us-west-XX.railway.app:XXXX/railway`

### Step 2: Add DATABASE_URL to Backend

1. Go back to your Railway project dashboard
2. **Click on your Backend service** (NOT the database)
3. Click on the **"Variables"** tab in the top menu
4. Click **"+ New Variable"** button
5. Add the variable:
   - **Variable Name:** `DATABASE_URL`
   - **Value:** [Paste the connection string you copied]
6. Click **"Add"** or **"Save"**

**Railway will automatically redeploy your backend** - this takes 1-2 minutes.

### Step 3: Initialize the Database Schema

After the backend restarts successfully:

1. Go back to your **PostgreSQL service** in Railway
2. Click on the **"Query"** tab
3. You'll see a SQL query editor
4. **Copy the entire contents** of your `backend/schema.sql` file
5. **Paste it** into the query editor
6. Click **"Execute"** or **"Run"**
7. You should see success messages for all the CREATE TABLE statements

### Step 4: Verify It Works

1. Check your **Backend logs**:
   - Click on your Backend service
   - Click **"Deployments"** or **"Logs"** tab
   - You should NO LONGER see "getaddrinfo ENOTFOUND" errors
   - Look for messages like "Database connected" (if your server.js logs this)

2. Check your **PostgreSQL**:
   - Click on PostgreSQL service
   - Go to **"Query"** tab
   - Run: `\dt` or `SELECT * FROM system_config;`
   - You should see your tables and the webhook URLs

### Step 5: Activate N8N Workflow

Don't forget to activate your N8N workflow for the webhooks to work:

1. Go to https://n8n-production-3f14.up.railway.app
2. Open your LinkedIn search workflow
3. Toggle the **"Active"** switch (top-right)
4. It should turn green/blue

## Visual Reference

### Finding DATABASE_URL
```
Railway Dashboard
  └── Your Project
      └── PostgreSQL Service (Click this)
          └── Connect Tab or Variables Tab
              └── DATABASE_URL: postgresql://postgres:...
                  └── [Copy Button]
```

### Adding to Backend
```
Railway Dashboard
  └── Your Project
      └── Backend Service (Click this)
          └── Variables Tab
              └── + New Variable
                  └── Name: DATABASE_URL
                  └── Value: [paste here]
                  └── Add
```

### Running Schema
```
Railway Dashboard
  └── Your Project
      └── PostgreSQL Service
          └── Query Tab
              └── [Paste schema.sql contents]
              └── Execute Button
```

## Troubleshooting

### Backend still showing errors?
- Wait 2-3 minutes for Railway to finish deploying
- Check the "Deployments" tab to see if build succeeded
- Click on latest deployment to see logs

### Can't find DATABASE_URL?
- Make sure you're in the **PostgreSQL service**, not Backend
- Try the "Connect" tab if you don't see it in "Variables"
- Look for "Postgres Connection URL" or similar

### Schema execution failed?
- Check for syntax errors in the output
- Try running the DROP statements first (from reset-database.sql)
- Make sure you copied the ENTIRE schema.sql file

### Webhook still not working?
- Verify DATABASE_URL was added to Backend (not Frontend or Database)
- Check that N8N workflow is Active (green toggle)
- Restart Backend service manually if needed

## Success Indicators

✅ Backend logs show no database connection errors
✅ PostgreSQL Query tab shows tables when you run `\dt`
✅ `system_config` table has the correct webhook URL (without `/webhook-test/`)
✅ N8N workflow shows as Active
✅ LinkedIn search returns candidates without 404 errors

## Need Help?

If you're stuck, check:
1. Backend service environment variables - should have `DATABASE_URL`
2. PostgreSQL service is running (green status)
3. Backend deployment succeeded (check Deployments tab)
4. N8N workflow is Active

---

**Note:** This will fix BOTH issues:
1. Database connection (so your app can store candidates/jobs)
2. Webhook URL (from test mode to production mode)
