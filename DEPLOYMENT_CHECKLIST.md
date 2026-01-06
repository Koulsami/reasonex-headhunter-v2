# Railway Deployment Checklist

## Pre-Deployment Verification

### ✅ Structure Cleanup (COMPLETED)
- [x] Removed duplicate `/frontend` folder
- [x] Root directory is frontend (React + Vite)
- [x] Backend in `/backend` directory
- [x] Fixed environment variable handling for Vite
- [x] Created deployment documentation

### 📋 Before You Start

**Required Credentials:**
- [ ] Google Gemini API Key - Get from: https://aistudio.google.com/app/apikey
- [ ] Google OAuth Client ID - Get from: https://console.cloud.google.com/apis/credentials
- [ ] GitHub Repository Access - Ensure Railway has access to your repo

---

## Phase A: Database Setup (15 minutes)

### Steps:
1. [ ] Login to Railway Dashboard: https://railway.app
2. [ ] Click **"New Project"** → **"Provision PostgreSQL"**
3. [ ] Wait for database to provision (1-2 minutes)
4. [ ] Go to database service → **"Variables"** tab
5. [ ] Copy `DATABASE_URL` value to clipboard
6. [ ] **IMPORTANT:** Save this URL securely for Phase B

### Verification:
- [ ] Database status shows "Active" in Railway dashboard
- [ ] DATABASE_URL copied and saved

---

## Phase B: Backend Deployment (20 minutes)

### Steps:

#### 1. Create Service
1. [ ] In Railway Dashboard → Click **"New"** → **"GitHub Repo"**
2. [ ] Select: `reasonex-headhunter-v2`
3. [ ] Service Name: `reasonex-backend`

#### 2. Configure Root Directory
1. [ ] Go to **Settings** → **"Service"** section
2. [ ] Set **"Root Directory"**: `/backend`
3. [ ] **Build Command**: `npm install` (should auto-detect)
4. [ ] **Start Command**: `npm start` (should auto-detect)

#### 3. Set Environment Variables
1. [ ] Go to **"Variables"** tab
2. [ ] Add the following variables:

```
DATABASE_URL=<paste from Phase A>
GOOGLE_CLIENT_ID=<your OAuth client ID>
PORT=3001
NODE_ENV=production
```

#### 4. Generate Public Domain
1. [ ] Go to **Settings** → **"Networking"**
2. [ ] Click **"Generate Domain"**
3. [ ] **COPY THE URL** (e.g., `reasonex-backend-production.up.railway.app`)
4. [ ] **SAVE THIS URL** - you'll need it for Phase C!

#### 5. Deploy
1. [ ] Railway auto-deploys on configuration
2. [ ] Monitor **"Deployments"** tab for build progress
3. [ ] Wait until status shows **"Success"**

### Verification:
- [ ] Deployment status: Success
- [ ] Logs show: "Server running on port 3001" (or similar)
- [ ] No error messages in logs
- [ ] Backend URL saved for Phase C

### Troubleshooting:
If deployment fails, check:
- [ ] All environment variables are set correctly
- [ ] DATABASE_URL includes full connection string
- [ ] Build logs for missing dependencies

---

## Phase C: Frontend Deployment (20 minutes)

### Steps:

#### 1. Create Service
1. [ ] In Railway Dashboard → Click **"New"** → **"GitHub Repo"**
2. [ ] Select: `reasonex-headhunter-v2` (same repo)
3. [ ] Service Name: `reasonex-frontend`

#### 2. Configure Root Directory
1. [ ] Go to **Settings** → **"Service"** section
2. [ ] Set **"Root Directory"**: `/` (root)
3. [ ] **Build Command**: `npm install && npm run build`
4. [ ] **Start Command**: Leave blank (Railway auto-serves from dist/)
5. [ ] **Output Directory**: `dist`

#### 3. Set Environment Variables
1. [ ] Go to **"Variables"** tab
2. [ ] Add the following variables:

```
VITE_API_KEY=<your Gemini API key>
VITE_BACKEND_URL=https://<backend-url-from-phase-b>
NODE_ENV=production
```

**IMPORTANT:** Replace `<backend-url-from-phase-b>` with the FULL URL from Phase B (without trailing `/api`)

Example:
```
VITE_BACKEND_URL=https://reasonex-backend-production.up.railway.app
```

#### 4. Deploy
1. [ ] Railway auto-deploys on configuration
2. [ ] Monitor **"Build Logs"** - should show Vite building
3. [ ] Build takes ~2-5 minutes
4. [ ] Wait until status shows **"Success"**

#### 5. Get Frontend URL
1. [ ] Go to **Settings** → **"Networking"**
2. [ ] Railway auto-generates domain
3. [ ] **COPY THE URL** (e.g., `reasonex-frontend-production.up.railway.app`)

### Verification:
- [ ] Deployment status: Success
- [ ] Build logs show: "✓ built in XXXXms"
- [ ] No Vite build errors
- [ ] Frontend URL accessible

---

## Post-Deployment Verification (10 minutes)

### Backend Health Check:
1. [ ] Visit: `https://<your-backend-url>/api/init`
2. [ ] Should return JSON (may show error if not authenticated - that's OK)
3. [ ] Check Railway logs for database connection success

### Frontend Health Check:
1. [ ] Visit: `https://<your-frontend-url>`
2. [ ] Application should load (no white screen)
3. [ ] Open browser DevTools → Console
4. [ ] Check for errors (ignore warnings about mock data)

### Integration Test:
1. [ ] Click **"Sign in with Google"** on frontend
2. [ ] Complete OAuth flow
3. [ ] After login, check Console for API calls
4. [ ] Verify API calls go to correct backend URL
5. [ ] Check Network tab: calls should be to `https://<backend-url>/api/*`

### Gemini AI Test:
1. [ ] Navigate to **Intelligence** tab
2. [ ] Test job description analysis
3. [ ] Verify Gemini API is working (no mock data warnings)

---

## Common Issues & Solutions

### Issue: Frontend shows blank white screen
**Solution:**
- Check browser Console for errors
- Verify all `VITE_` environment variables are set
- Check Railway build logs for Vite errors
- Ensure `VITE_BACKEND_URL` doesn't have trailing slash

### Issue: API calls fail with CORS errors
**Solution:**
- Verify backend CORS is enabled (check backend/server.js line 21)
- Ensure `VITE_BACKEND_URL` matches exact backend domain
- Check backend logs for incoming requests

### Issue: "Missing API_KEY" warnings
**Solution:**
- Verify `VITE_API_KEY` is set in Railway frontend variables
- Variable must start with `VITE_` prefix (Vite requirement)
- Redeploy frontend after adding variable

### Issue: Database connection fails
**Solution:**
- Check `DATABASE_URL` in backend variables is correct
- Verify PostgreSQL service is running in Railway
- Check backend logs for connection errors
- Ensure SSL is enabled (`ssl: { rejectUnauthorized: false }`)

### Issue: OAuth login fails
**Solution:**
- Verify `GOOGLE_CLIENT_ID` is set in backend variables
- Check OAuth redirect URIs in Google Console include frontend URL
- Ensure frontend and backend can communicate

---

## Production Configuration

### Update OAuth Redirect URIs:
1. [ ] Go to: https://console.cloud.google.com/apis/credentials
2. [ ] Select your OAuth Client ID
3. [ ] Add to **Authorized JavaScript origins**:
   - `https://<your-frontend-url>`
4. [ ] Add to **Authorized redirect URIs**:
   - `https://<your-frontend-url>`

### Security Checklist:
- [ ] `.env.local` is in `.gitignore`
- [ ] No API keys committed to git
- [ ] CORS configured for production domain only (optional hardening)
- [ ] Database uses SSL connection

---

## Monitoring & Maintenance

### What to Monitor:
- [ ] Railway deployment status dashboard
- [ ] Application logs (backend + frontend)
- [ ] Database usage metrics
- [ ] API call volume (Gemini)

### Automatic Deployments:
- Both services auto-deploy on `git push` to main branch
- Monitor deployments in Railway dashboard
- Rollback available via Railway UI if needed

---

## Support Resources

- **Railway Docs:** https://docs.railway.app
- **Vite Env Vars:** https://vitejs.dev/guide/env-and-mode.html
- **Railway Discord:** https://discord.gg/railway

---

## Quick Reference

**Backend URL:** `https://<your-backend-domain>.up.railway.app`
**Frontend URL:** `https://<your-frontend-domain>.up.railway.app`
**Database:** Provisioned PostgreSQL on Railway

**Key Files:**
- Backend config: [backend/server.js](backend/server.js)
- Frontend config: [vite.config.ts](vite.config.ts)
- API service: [services/apiService.ts](services/apiService.ts)
- Gemini service: [services/geminiService.ts](services/geminiService.ts)

---

## Notes Schema Database (Optional)

The `backend/schema.sql` is currently empty. If you need to initialize database tables:

1. Create your schema SQL
2. In Railway → Database service → Query tab
3. Run your SQL to create tables
4. Or use migration tools like `node-pg-migrate`

**Backend handles table creation automatically via `CREATE TABLE IF NOT EXISTS` in server.js**
