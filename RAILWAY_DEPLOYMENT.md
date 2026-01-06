# Railway Deployment Guide - Reasonex HeadHunter V2

## Project Structure
This is a monorepo with two separate services:
- **Frontend**: React + Vite (Root directory)
- **Backend**: Node.js + Express + PostgreSQL (`/backend` directory)

---

## Deployment Strategy: 3-Phase Master Plan

### Phase A: Database Setup
1. In Railway Dashboard, click **"New"** → **"Database"** → **"PostgreSQL"**
2. Once provisioned, go to the **Variables** tab
3. Copy the `DATABASE_URL` value (you'll need this in Phase B)

---

### Phase B: Backend Deployment

1. **Create Backend Service:**
   - Click **"New"** → **"GitHub Repo"** → Select `reasonex-headhunter-v2`
   - Service Name: `reasonex-backend`

2. **Configure Settings:**
   - Go to **Settings** → **Service**
   - Root Directory: `/backend`
   - Build Command: `npm install` (auto-detected)
   - Start Command: `npm start` (auto-detected)

3. **Set Environment Variables:**
   - Go to **Variables** tab and add:
     ```
     DATABASE_URL=<paste from Phase A>
     GOOGLE_CLIENT_ID=<your OAuth client ID>
     PORT=3001
     NODE_ENV=production
     ```

4. **Generate Public Domain:**
   - Go to **Settings** → **Networking**
   - Click **"Generate Domain"**
   - Copy the URL (e.g., `reasonex-backend-production.up.railway.app`)
   - **IMPORTANT:** Save this URL for Phase C!

5. **Deploy:**
   - Railway will auto-deploy on push to main branch
   - Monitor logs to ensure successful deployment

---

### Phase C: Frontend Deployment

1. **Create Frontend Service:**
   - Click **"New"** → **"GitHub Repo"** → Select `reasonex-headhunter-v2` (same repo)
   - Service Name: `reasonex-frontend`

2. **Configure Settings:**
   - Go to **Settings** → **Service**
   - Root Directory: `/` (Root)
   - Build Command: `npm install && npm run build`
   - Start Command: Leave empty (Railway auto-serves static files from `dist/`)
   - Output Directory: `dist`

3. **Set Environment Variables:**
   - Go to **Variables** tab and add:
     ```
     API_KEY=<your Gemini API key>
     REACT_APP_BACKEND_URL=https://<backend-url-from-phase-b>
     NODE_ENV=production
     VITE_BACKEND_URL=https://<backend-url-from-phase-b>
     ```

   **Note:** Vite uses `VITE_` prefix for runtime env vars, but your code uses `REACT_APP_BACKEND_URL`. Both are included for compatibility.

4. **Deploy:**
   - Railway will auto-deploy on push to main branch
   - Monitor build logs to ensure Vite builds successfully

---

## Important Notes

### Backend Configuration
- The backend uses `railway.backend.json` configuration (optional reference)
- Railway auto-detects Node.js and uses `package.json` scripts
- CORS is configured in `backend/server.js` - verify it allows your frontend domain

### Frontend Configuration
- Vite will bundle all React code into static files in `dist/`
- Railway automatically serves static files with appropriate headers
- Build output must go to `dist/` (configured in `vite.config.ts`)

### Environment Variables
**Backend needs:**
- `DATABASE_URL` - PostgreSQL connection string
- `GOOGLE_CLIENT_ID` - OAuth client ID
- `PORT` - Server port (Railway provides this automatically, but 3001 is fallback)

**Frontend needs:**
- `API_KEY` - Google Gemini API key (for AI features)
- `REACT_APP_BACKEND_URL` - Backend service URL from Phase B
- `VITE_BACKEND_URL` - Alternative Vite-compatible env var

### Watch Patterns
For monorepo efficiency:
- Backend watches: `backend/**`
- Frontend watches: root directory changes (auto-configured)

---

## Verification Steps

### After Phase B (Backend):
1. Visit: `https://<your-backend-domain>/health` (if health endpoint exists)
2. Check Railway logs for successful startup
3. Verify database connection in logs

### After Phase C (Frontend):
1. Visit your frontend domain
2. Open browser DevTools → Network tab
3. Verify API calls are going to the correct backend URL
4. Test OAuth login flow
5. Test Gemini AI features

---

## Troubleshooting

### Build Failures
- **Backend:** Check `backend/package.json` has all dependencies
- **Frontend:** Ensure `@google/genai` is properly installed

### CORS Errors
- Update `backend/server.js` CORS config to include frontend domain
- Add frontend URL to allowed origins

### Database Connection Issues
- Verify `DATABASE_URL` is correctly set in backend variables
- Check Railway database service is running
- Review connection string format in `backend/server.js`

### Environment Variable Issues
- Railway env vars are available at build time and runtime
- Vite needs `VITE_` prefix for client-side vars
- Verify `.env.local` is in `.gitignore` (don't commit secrets!)

---

## Post-Deployment

### Continuous Deployment
- Both services auto-deploy on git push to main branch
- Use Railway's GitHub integration for PR previews (optional)

### Monitoring
- Check Railway logs for errors
- Set up alerts in Railway dashboard
- Monitor database usage

### Scaling
- Railway handles auto-scaling
- Upgrade plan if needed for higher traffic
- Consider adding Redis for session management (future enhancement)

---

## Quick Reference

**Backend URL Format:** `https://reasonex-backend-production.up.railway.app`
**Frontend URL Format:** `https://reasonex-frontend-production.up.railway.app`

**Railway Dashboard:** https://railway.app/dashboard

**Support:**
- Railway Docs: https://docs.railway.app
- Railway Discord: https://discord.gg/railway
