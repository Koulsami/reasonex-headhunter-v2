# Customer Frontend Deployment Guide

## Overview

This guide explains how to deploy a customer-specific frontend connected to your shared multi-tenant backend.

**Time Required**: ~30 minutes per customer

---

## Prerequisites

✅ Backend with multi-tenant support deployed on Railway
✅ Database migration (002_add_multi_tenant_support.sql) applied
✅ Customer details: company name, domain, branding preferences

---

## Step 1: Add Customer to Database

### 1.1 Connect to Railway PostgreSQL

Via Railway Dashboard:
1. Go to Railway Dashboard → Your Project → PostgreSQL service
2. Click **Query** tab

OR via local connection:
```bash
psql postgresql://postgres:password@host:port/database
```

### 1.2 Insert Tenant Record

```sql
INSERT INTO tenants (id, name, domain, subdomain, settings) VALUES
    ('customer-xyz', 'XYZ Corporation', 'xyz.com', 'xyz', '{
        "branding": {
            "appName": "XYZ Recruitment Platform",
            "primaryColor": "#FF6B35",
            "logo": "https://xyz.com/logo.png"
        },
        "features": {
            "linkedinSearch": true,
            "googleSearch": true,
            "intelligence": true,
            "aiAnalysis": true
        },
        "limits": {
            "maxUsers": 50,
            "maxProjects": 500,
            "maxCandidates": 10000
        }
    }');
```

**Parameters**:
- `id`: Unique tenant identifier (lowercase, no spaces, e.g., 'customer-xyz')
- `name`: Display name for customer
- `domain`: Custom domain if customer has one (e.g., 'xyz.com')
- `subdomain`: Subdomain prefix (e.g., 'xyz' → xyz.reasonex.com)
- `settings`: JSON with branding, features, and limits

### 1.3 Add Admin User for Customer

```sql
-- Add customer admin to authorized_users
INSERT INTO authorized_users (email, role, tenant_id) VALUES
    ('admin@xyz.com', 'admin', 'customer-xyz');
```

---

## Step 2: Create Customer Frontend

### 2.1 Fork/Copy Frontend Code

```bash
# Create customer directory
cp -r reasonex-headhunter-v2 customer-xyz-frontend

# Navigate to customer directory
cd customer-xyz-frontend
```

### 2.2 Update Environment Variables

Create `.env` file:

```bash
# .env
VITE_BACKEND_URL=https://your-backend.railway.app
VITE_TENANT_ID=customer-xyz
VITE_GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
VITE_APP_NAME=XYZ Recruitment Platform
VITE_PRIMARY_COLOR=#FF6B35
```

**Important Environment Variables**:
- `VITE_BACKEND_URL`: Your shared backend URL (same for all customers)
- `VITE_TENANT_ID`: Matches `id` from tenants table ('customer-xyz')
- `VITE_APP_NAME`: Custom app name for this customer
- `VITE_PRIMARY_COLOR`: Brand color (optional)

### 2.3 Update API Client to Send Tenant Header

**File**: `services/api.ts`

Add this at the top:

```typescript
const TENANT_ID = import.meta.env.VITE_TENANT_ID || 'reasonex';

// Update all fetch calls to include X-Tenant-Id header
const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
    'X-Tenant-Id': TENANT_ID  // Add this line
};
```

**Example**:

```typescript
export const api = {
    async upsertJob(job: Job) {
        const response = await fetch(`${backendUrl}/api/jobs`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
                'X-Tenant-Id': import.meta.env.VITE_TENANT_ID || 'reasonex'
            },
            body: JSON.stringify(job)
        });
        return response.json();
    }
};
```

### 2.4 Customize Branding (Optional)

**Logo**: Replace `public/logo.png` with customer logo

**Colors**: Update `src/index.css` or use CSS variables

```css
/* Custom CSS for customer-xyz */
:root {
  --primary-color: #FF6B35;
  --primary-hover: #E5602E;
}
```

**App Title**: Update `index.html`

```html
<title>XYZ Recruitment Platform</title>
```

---

## Step 3: Deploy Frontend

### Option A: Netlify (Recommended)

#### 3.1 Build the Frontend

```bash
npm install
npm run build
```

#### 3.2 Deploy to Netlify

**Via CLI**:
```bash
npm install -g netlify-cli
netlify login
netlify deploy --prod --dir=dist
```

**Via Dashboard**:
1. Go to [Netlify](https://app.netlify.com)
2. Click **Add new site** → **Deploy manually**
3. Drag and drop the `dist` folder
4. Site will be deployed to `random-name.netlify.app`

#### 3.3 Configure Custom Domain (Optional)

1. In Netlify Dashboard → Site settings → Domain management
2. Add custom domain: `xyz.com` or `app.xyz.com`
3. Configure DNS records:
   ```
   CNAME  app  random-name.netlify.app
   ```

---

### Option B: Vercel

```bash
npm install -g vercel
vercel login
vercel --prod
```

---

### Option C: Railway (Frontend Hosting)

1. Create new Railway service
2. Connect GitHub repo
3. Set build command: `npm run build`
4. Set start command: `npm run preview`
5. Add environment variables from `.env`

---

## Step 4: Configure DNS (For Custom Domains)

### Subdomain Routing (xyz.reasonex.com)

**Setup**:
1. Add CNAME record in your DNS:
   ```
   CNAME  xyz  your-netlify-site.netlify.app
   ```

2. Backend automatically detects subdomain and routes to tenant 'customer-xyz'

**How it works**:
```
User visits: xyz.reasonex.com
  ↓
Frontend loads with VITE_TENANT_ID=customer-xyz
  ↓
API calls include X-Tenant-Id: customer-xyz
  ↓
Backend extracts tenant from subdomain OR header
  ↓
Data filtered by tenant_id = 'customer-xyz'
```

### Custom Domain Routing (xyz.com)

**Setup**:
1. Update tenant record with custom domain:
   ```sql
   UPDATE tenants SET domain = 'xyz.com' WHERE id = 'customer-xyz';
   ```

2. Configure DNS:
   ```
   CNAME  @  your-netlify-site.netlify.app
   ```

3. Backend detects domain and maps to tenant

---

## Step 5: Test Deployment

### 5.1 Verify Tenant Isolation

```bash
# Test that customer can log in
curl -X POST https://your-backend.railway.app/api/auth/google \
  -H "Content-Type: application/json" \
  -H "X-Tenant-Id: customer-xyz" \
  -d '{"token":"google-oauth-token"}'

# Test data isolation
curl https://your-backend.railway.app/api/init \
  -H "Authorization: Bearer DEV_TOKEN_REASONEX" \
  -H "X-Tenant-Id: customer-xyz"
```

### 5.2 Manual Testing

1. Visit customer frontend: `https://xyz.netlify.app` or `https://xyz.com`
2. Log in with customer admin email: `admin@xyz.com`
3. Create test project
4. Add test candidate
5. Verify data appears only for this tenant

### 5.3 Run Isolation Test

```bash
# From your local backend
node backend/test-tenant-isolation.js
```

Should show:
```
✓ ALL TESTS PASSED - Tenant isolation is working correctly!
```

---

## Step 6: User Onboarding

### 6.1 Add Users to Customer Tenant

Via Admin Panel:
1. Log in as customer admin
2. Go to **Admin** → **Security**
3. Add user emails

Via SQL:
```sql
INSERT INTO authorized_users (email, role, tenant_id) VALUES
    ('user1@xyz.com', 'user', 'customer-xyz'),
    ('user2@xyz.com', 'user', 'customer-xyz'),
    ('manager@xyz.com', 'admin', 'customer-xyz');
```

### 6.2 Add Team Members

Via Admin Panel:
1. **Admin** → **Security** → **Add Recruiter**
2. Enter name, email, role

Via SQL:
```sql
INSERT INTO app_users (id, name, role, avatar, color, tenant_id) VALUES
    ('user-xyz-1', 'John Smith', 'Recruiter', 'JS', 'bg-green-100 text-green-700', 'customer-xyz'),
    ('user-xyz-2', 'Jane Doe', 'Manager', 'JD', 'bg-purple-100 text-purple-700', 'customer-xyz');
```

---

## Deployment Checklist

### Database Setup
- [ ] Tenant record created in `tenants` table
- [ ] Admin user added to `authorized_users`
- [ ] Subdomain/domain configured correctly

### Frontend Deployment
- [ ] `.env` file created with correct VITE_TENANT_ID
- [ ] API client updated to send X-Tenant-Id header
- [ ] Branding customized (logo, colors, name)
- [ ] Build successful (`npm run build`)
- [ ] Deployed to Netlify/Vercel/Railway
- [ ] Custom domain configured (if applicable)

### DNS Configuration (if custom domain)
- [ ] CNAME record added pointing to hosting platform
- [ ] Domain added to tenant record in database
- [ ] SSL certificate provisioned

### Testing
- [ ] User can log in with customer email
- [ ] Data isolation verified (cannot see other tenants' data)
- [ ] All features working (projects, candidates, search)
- [ ] Isolation test script passes

---

## Troubleshooting

### Issue: "User not authorized for tenant"

**Cause**: Email not in `authorized_users` table for this tenant

**Fix**:
```sql
SELECT * FROM authorized_users WHERE email = 'user@xyz.com' AND tenant_id = 'customer-xyz';
-- If empty, add user:
INSERT INTO authorized_users (email, role, tenant_id) VALUES ('user@xyz.com', 'user', 'customer-xyz');
```

### Issue: Can see other tenants' data

**Cause**: Tenant header not being sent or backend not filtering

**Check**:
1. Verify `X-Tenant-Id` header in browser DevTools → Network tab
2. Check backend logs for tenant extraction: `console.log('[Tenant]...`
3. Verify database migration applied: `SELECT * FROM tenants;`

**Fix**:
```typescript
// Ensure all API calls include header
headers: {
    'X-Tenant-Id': import.meta.env.VITE_TENANT_ID
}
```

### Issue: Subdomain not routing correctly

**Cause**: DNS not configured or backend not extracting subdomain

**Check**:
1. Verify CNAME record: `dig xyz.reasonex.com`
2. Check tenant record: `SELECT * FROM tenants WHERE subdomain = 'xyz';`
3. Test backend: `curl -H "Host: xyz.reasonex.com" https://your-backend.railway.app/api/init`

**Fix**:
```sql
UPDATE tenants SET subdomain = 'xyz' WHERE id = 'customer-xyz';
```

---

## Cost Per Customer

| Component | Cost |
|-----------|------|
| Frontend Hosting (Netlify Free Tier) | $0/mo |
| Shared Backend (Railway) | $0/mo (included) |
| Shared Database (Railway) | $0/mo (included) |
| Custom Domain (optional) | ~$12/year |
| **Total per customer** | **~$0-1/mo** |

**Note**: All customers share the same backend and database, so only the frontend deployment has marginal cost (which is free on Netlify/Vercel).

---

## Example: Complete Deployment for "Acme Corp"

```bash
# 1. Add tenant to database
psql $DATABASE_URL -c "INSERT INTO tenants (id, name, domain, subdomain) VALUES ('acme', 'Acme Corp', 'acme.com', 'acme');"

# 2. Add admin user
psql $DATABASE_URL -c "INSERT INTO authorized_users (email, role, tenant_id) VALUES ('admin@acme.com', 'admin', 'acme');"

# 3. Create frontend
cp -r reasonex-headhunter-v2 acme-frontend
cd acme-frontend

# 4. Configure environment
cat > .env <<EOF
VITE_BACKEND_URL=https://reasonex-backend.railway.app
VITE_TENANT_ID=acme
VITE_GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
VITE_APP_NAME=Acme Recruitment
EOF

# 5. Update API to send tenant header (manual step in services/api.ts)

# 6. Build and deploy
npm install
npm run build
netlify deploy --prod --dir=dist

# 7. Configure DNS
# Add CNAME: acme.reasonex.com → your-netlify-site.netlify.app

# 8. Test
curl -H "X-Tenant-Id: acme" https://reasonex-backend.railway.app/api/init
```

**Done!** Acme Corp now has their own branded recruitment platform at `acme.reasonex.com` or `acme.com`, with complete data isolation.

---

## Next Customer

To deploy for another customer, repeat steps 1-8 with different:
- Tenant ID (e.g., 'customer-b')
- Subdomain (e.g., 'customerb')
- Branding (logo, colors, app name)
- Admin email

Each deployment takes ~30 minutes and costs $0/month!

---

**Last Updated**: 2026-01-08
**Version**: Multi-Tenant v1.0
**Support**: See MULTI_TENANT_STRATEGY.md for architecture details
