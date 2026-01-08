# Multi-Tenant Strategy Guide

## Question: Can I create customer-specific frontends connected to the same backend and database?

**Short Answer**: Yes, you can do both approaches. The best choice depends on your business model and requirements.

---

## Option 1: Shared Backend + Database (Multi-Tenancy) ✅ RECOMMENDED

### Architecture

```
Customer A Frontend (customera.com)  ──┐
                                       ├──> Shared Backend (API) ──> Shared Database
Customer B Frontend (customerb.com)  ──┘
```

### How It Works

**Single Backend + Database**:
- One Railway backend service
- One PostgreSQL database
- Multiple frontend deployments (one per customer)

**Data Isolation**:
```sql
-- Add tenant_id to all tables
ALTER TABLE clients ADD COLUMN tenant_id VARCHAR(50);
ALTER TABLE jobs ADD COLUMN tenant_id VARCHAR(50);
ALTER TABLE candidates ADD COLUMN tenant_id VARCHAR(50);
ALTER TABLE app_users ADD COLUMN tenant_id VARCHAR(50);

-- Filter all queries by tenant
SELECT * FROM jobs WHERE tenant_id = 'customer-a';
```

**Authentication Flow**:
```
1. Customer A user logs in → Frontend sends request with tenant header
2. Backend extracts tenant from header/subdomain/token
3. All queries filtered by tenant_id
4. User only sees their company's data
```

### Implementation Steps

#### Step 1: Add Tenant Support to Database

**Migration**: `backend/migrations/002_add_multi_tenant_support.sql`

```sql
-- Add tenant_id column to all tables
ALTER TABLE clients ADD COLUMN tenant_id VARCHAR(50) NOT NULL DEFAULT 'reasonex';
ALTER TABLE jobs ADD COLUMN tenant_id VARCHAR(50) NOT NULL DEFAULT 'reasonex';
ALTER TABLE candidates ADD COLUMN tenant_id VARCHAR(50) NOT NULL DEFAULT 'reasonex';
ALTER TABLE app_users ADD COLUMN tenant_id VARCHAR(50) NOT NULL DEFAULT 'reasonex';
ALTER TABLE authorized_users ADD COLUMN tenant_id VARCHAR(50) NOT NULL DEFAULT 'reasonex';

-- Create tenant table
CREATE TABLE tenants (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    domain VARCHAR(255) UNIQUE,
    subdomain VARCHAR(100) UNIQUE,
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW(),
    active BOOLEAN DEFAULT TRUE
);

-- Add foreign keys
ALTER TABLE clients ADD CONSTRAINT fk_clients_tenant
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;
ALTER TABLE jobs ADD CONSTRAINT fk_jobs_tenant
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;
ALTER TABLE candidates ADD CONSTRAINT fk_candidates_tenant
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;

-- Create indexes
CREATE INDEX idx_clients_tenant ON clients(tenant_id);
CREATE INDEX idx_jobs_tenant ON jobs(tenant_id);
CREATE INDEX idx_candidates_tenant ON candidates(tenant_id);
CREATE INDEX idx_users_tenant ON app_users(tenant_id);

-- Insert default tenant
INSERT INTO tenants (id, name, domain, subdomain) VALUES
    ('reasonex', 'Reasonex', 'reasonex.com', 'app'),
    ('customer-a', 'Customer A', 'customera.com', 'customera'),
    ('customer-b', 'Customer B', 'customerb.com', 'customerb');
```

#### Step 2: Update Backend Middleware

**Add Tenant Context Middleware**: `backend/server.js`

```javascript
// Middleware to extract tenant from request
const extractTenant = async (req, res, next) => {
    let tenantId = null;

    // Method 1: From subdomain (customera.reasonex.com)
    const host = req.headers.host || '';
    const subdomain = host.split('.')[0];

    if (subdomain && subdomain !== 'app' && subdomain !== 'www') {
        const tenantResult = await pool.query(
            'SELECT id FROM tenants WHERE subdomain = $1 AND active = true',
            [subdomain]
        );
        if (tenantResult.rows[0]) {
            tenantId = tenantResult.rows[0].id;
        }
    }

    // Method 2: From custom header (for custom domains)
    if (!tenantId && req.headers['x-tenant-id']) {
        tenantId = req.headers['x-tenant-id'];
    }

    // Method 3: From domain mapping
    if (!tenantId) {
        const tenantResult = await pool.query(
            'SELECT id FROM tenants WHERE domain = $1 AND active = true',
            [host]
        );
        if (tenantResult.rows[0]) {
            tenantId = tenantResult.rows[0].id;
        }
    }

    // Default to 'reasonex' if no tenant identified
    req.tenantId = tenantId || 'reasonex';
    next();
};

// Apply middleware to all routes
app.use(extractTenant);
```

**Update All Queries to Include Tenant Filter**:

```javascript
// OLD: Get all jobs
app.get('/api/jobs', verifyToken, async (req, res) => {
    const result = await pool.query('SELECT * FROM jobs');
    res.json(result.rows);
});

// NEW: Get jobs filtered by tenant
app.get('/api/jobs', verifyToken, async (req, res) => {
    const result = await pool.query(
        'SELECT * FROM jobs WHERE tenant_id = $1',
        [req.tenantId]
    );
    res.json(result.rows);
});

// OLD: Create job
app.post('/api/jobs', verifyToken, async (req, res) => {
    const { id, clientId, title, ... } = req.body;
    await pool.query(
        'INSERT INTO jobs (id, client_id, title, ...) VALUES ($1, $2, $3, ...)',
        [id, clientId, title, ...]
    );
});

// NEW: Create job with tenant
app.post('/api/jobs', verifyToken, async (req, res) => {
    const { id, clientId, title, ... } = req.body;
    await pool.query(
        'INSERT INTO jobs (id, client_id, title, ..., tenant_id) VALUES ($1, $2, $3, ..., $4)',
        [id, clientId, title, ..., req.tenantId]
    );
});
```

#### Step 3: Deploy Customer-Specific Frontends

**For Customer A**:

```bash
# Clone the frontend
cp -r reasonex-headhunter-v2 customer-a-frontend

# Update environment variables
# customer-a-frontend/.env
VITE_BACKEND_URL=https://your-backend.railway.app
VITE_TENANT_ID=customer-a
VITE_GOOGLE_CLIENT_ID=customer-a-google-client-id
VITE_APP_NAME=Customer A Recruitment
```

**Customize Branding**: `customer-a-frontend/App.tsx`

```typescript
// Change logo, colors, company name
const APP_NAME = import.meta.env.VITE_APP_NAME || 'Customer A Recruitment';
const PRIMARY_COLOR = '#FF5733'; // Customer A brand color
```

**Deploy to Netlify/Vercel**:

```bash
cd customer-a-frontend
npm run build

# Deploy to customera.netlify.app or customera.yourplatform.com
```

#### Step 4: Frontend Tenant Header

**Update API calls**: `services/api.ts`

```typescript
const tenantId = import.meta.env.VITE_TENANT_ID || 'reasonex';

export const api = {
    async upsertJob(job: Job) {
        const response = await fetch(`${backendUrl}/api/jobs`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
                'X-Tenant-Id': tenantId  // Add tenant header
            },
            body: JSON.stringify(job)
        });
        return response.json();
    }
};
```

### Pros of Option 1 ✅

| Benefit | Description |
|---------|-------------|
| **Cost Effective** | One backend + one database for all customers |
| **Easy Maintenance** | Update backend once, all customers benefit |
| **Centralized Data** | Cross-customer analytics, reporting, aggregation |
| **Faster Onboarding** | Deploy new frontend only (backend already running) |
| **Shared Resources** | Lower Railway costs, single PostgreSQL instance |
| **Consistent Features** | All customers get same features immediately |

### Cons of Option 1 ⚠️

| Risk | Mitigation |
|------|------------|
| **Data Leakage** | Strict tenant_id filtering, database-level RLS |
| **Performance** | Use indexes on tenant_id, connection pooling |
| **Compliance** | Some industries require physical data separation |
| **Single Point of Failure** | If backend/DB down, all customers affected |
| **Customization Limits** | All customers share same API logic |

### Security Best Practices

**1. Row-Level Security (RLS)**:

```sql
-- Enable RLS on all tables
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;

-- Create policy
CREATE POLICY tenant_isolation_policy ON jobs
    USING (tenant_id = current_setting('app.tenant_id')::VARCHAR);

-- Set tenant in session
SET app.tenant_id = 'customer-a';
```

**2. Validation Middleware**:

```javascript
const validateTenantAccess = async (req, res, next) => {
    const { jobId } = req.params;
    const result = await pool.query(
        'SELECT tenant_id FROM jobs WHERE id = $1',
        [jobId]
    );

    if (result.rows[0]?.tenant_id !== req.tenantId) {
        return res.status(403).json({ error: 'Access denied' });
    }
    next();
};

app.delete('/api/jobs/:id', verifyToken, validateTenantAccess, async (req, res) => {
    // Safe to delete - tenant verified
});
```

---

## Option 2: Separate Backend + Database (Full Isolation)

### Architecture

```
Customer A Frontend ──> Customer A Backend ──> Customer A Database (Railway)
Customer B Frontend ──> Customer B Backend ──> Customer B Database (Railway)
```

### Implementation

**For Each Customer**:

1. Deploy separate Railway backend service
2. Create separate PostgreSQL database
3. Deploy separate frontend
4. Each customer is completely isolated

### Pros of Option 2 ✅

| Benefit | Description |
|---------|-------------|
| **Complete Isolation** | Zero risk of data leakage between tenants |
| **Custom Features** | Each customer can have different API logic |
| **Performance** | No shared resource contention |
| **Compliance** | Meets strict data residency requirements |
| **Independent Scaling** | Scale each customer's resources independently |
| **Fault Isolation** | One customer's issues don't affect others |

### Cons of Option 2 ⚠️

| Drawback | Impact |
|----------|--------|
| **High Cost** | 3x Railway services per customer (frontend/backend/DB) |
| **Maintenance Burden** | Update N backends separately for bug fixes |
| **Inconsistent Versions** | Customers may run different code versions |
| **Complex Deployment** | N deployments for every feature release |
| **No Cross-Customer Analytics** | Can't aggregate data across customers |

### Cost Comparison

**Example: 5 Customers**

| Component | Option 1 (Shared) | Option 2 (Isolated) |
|-----------|-------------------|---------------------|
| Backend Services | 1 × $20/mo | 5 × $20/mo = $100/mo |
| PostgreSQL | 1 × $15/mo | 5 × $15/mo = $75/mo |
| Frontend Hosting | 5 × Free (Netlify) | 5 × Free (Netlify) |
| **Total Monthly Cost** | **$35/mo** | **$175/mo** |

---

## Hybrid Option 3: Shared Backend + Separate Databases

### Architecture

```
Customer A Frontend ──┐
                      ├──> Shared Backend ──┬──> Customer A Database
Customer B Frontend ──┘                     └──> Customer B Database
```

### How It Works

**Single Backend with Dynamic Database Connections**:

```javascript
const tenantDatabases = {
    'customer-a': new Pool({ connectionString: process.env.DATABASE_URL_CUSTOMER_A }),
    'customer-b': new Pool({ connectionString: process.env.DATABASE_URL_CUSTOMER_B }),
    'reasonex': new Pool({ connectionString: process.env.DATABASE_URL })
};

const getTenantPool = (tenantId) => {
    return tenantDatabases[tenantId] || tenantDatabases['reasonex'];
};

app.get('/api/jobs', verifyToken, async (req, res) => {
    const pool = getTenantPool(req.tenantId);
    const result = await pool.query('SELECT * FROM jobs');
    res.json(result.rows);
});
```

### Pros of Option 3 ✅

- **Data Isolation**: Physical database separation for compliance
- **Code Maintenance**: Single backend codebase
- **Moderate Cost**: 1 backend + N databases
- **Customization**: Database-level customization (different schemas)

### Cons of Option 3 ⚠️

- **Database Cost**: Still paying for N databases
- **Connection Pool Overhead**: Managing multiple DB connections
- **Complexity**: More complex than Option 1, less isolated than Option 2

---

## Recommendation Matrix

| Scenario | Best Option | Why |
|----------|-------------|-----|
| **Startup/MVP** (1-10 customers) | **Option 1** | Lowest cost, fastest deployment |
| **SaaS Platform** (100+ customers) | **Option 1** | Cost-effective, proven multi-tenant pattern |
| **Enterprise Clients** (strict compliance) | **Option 2** | Meets data residency, audit requirements |
| **White-Label Product** (heavy customization) | **Option 2** | Each customer can have custom features |
| **Hybrid (some enterprise, some SMB)** | **Option 3** | Flexibility for different customer needs |
| **Healthcare/Finance** (HIPAA/SOC2) | **Option 2 or 3** | Physical data separation required |

---

## Current System Analysis

### What You Have Now

**Database Schema**: ✅ Already multi-tenant ready!

```sql
-- No tenant_id yet, but structure supports it:
- authorized_users (email-based access control) ✅
- app_users (team members) ✅
- clients (customer companies) ✅
- jobs (recruitment projects) ✅
- candidates (job candidates) ✅
```

**Backend**: ⚠️ Needs tenant filtering

```javascript
// Current: No tenant isolation
app.get('/api/jobs', verifyToken, async (req, res) => {
    const result = await pool.query('SELECT * FROM jobs');
    res.json(result.rows);
});

// Needed: Add WHERE tenant_id = $1
```

**Authentication**: ✅ Email-based access control works

```javascript
// authorized_users table already isolates by email
// Just add tenant_id column and you're done
```

---

## Implementation Roadmap

### For Option 1 (Shared Backend - RECOMMENDED)

**Phase 1: Database Migration** (1 hour)
1. ✅ Create tenants table
2. ✅ Add tenant_id to all tables
3. ✅ Backfill existing data with 'reasonex' tenant
4. ✅ Add indexes

**Phase 2: Backend Updates** (3 hours)
1. ✅ Add tenant extraction middleware
2. ✅ Update all queries to filter by tenant_id
3. ✅ Add tenant validation on write operations
4. ✅ Test thoroughly

**Phase 3: Frontend Deployment** (1 hour per customer)
1. ✅ Clone frontend repo
2. ✅ Update .env with VITE_TENANT_ID
3. ✅ Customize branding (logo, colors, name)
4. ✅ Deploy to customer subdomain/domain
5. ✅ Test isolation

**Phase 4: Security Hardening** (2 hours)
1. ✅ Enable Row-Level Security (RLS)
2. ✅ Add tenant access validation middleware
3. ✅ Audit all endpoints
4. ✅ Penetration testing

**Total Time**: ~8 hours for first customer, ~1 hour for each additional customer

### For Option 2 (Separate Everything)

**Per Customer** (4 hours)
1. ✅ Create new Railway project
2. ✅ Deploy backend service
3. ✅ Create PostgreSQL database
4. ✅ Run schema.sql
5. ✅ Clone and customize frontend
6. ✅ Deploy frontend
7. ✅ Test end-to-end

**Total Time**: ~4 hours per customer

---

## Code Examples

### Example: Tenant-Aware API (Option 1)

**File**: `backend/middleware/tenant.js`

```javascript
const extractTenant = async (req, res, next) => {
    const host = req.headers.host || '';
    const subdomain = host.split('.')[0];

    // Map subdomain to tenant
    const tenantMap = {
        'customera': 'customer-a',
        'customerb': 'customer-b',
        'app': 'reasonex'
    };

    req.tenantId = tenantMap[subdomain] || 'reasonex';
    console.log('Request tenant:', req.tenantId, 'from host:', host);
    next();
};

module.exports = { extractTenant };
```

**File**: `backend/server.js`

```javascript
const { extractTenant } = require('./middleware/tenant');

app.use(extractTenant);

// All queries now tenant-aware
app.get('/api/jobs', verifyToken, async (req, res) => {
    const result = await pool.query(
        'SELECT * FROM jobs WHERE tenant_id = $1',
        [req.tenantId]
    );
    res.json(result.rows);
});
```

### Example: Custom Domain per Customer

**DNS Setup**:

```
customera.com       → CNAME → customera.netlify.app
customerb.com       → CNAME → customerb.netlify.app
app.reasonex.com    → CNAME → reasonex.netlify.app
```

**Backend Domain Mapping**:

```javascript
const domainToTenant = {
    'customera.com': 'customer-a',
    'customerb.com': 'customer-b',
    'app.reasonex.com': 'reasonex'
};

const extractTenant = async (req, res, next) => {
    const host = req.headers.host.replace(/:\d+$/, ''); // Remove port
    req.tenantId = domainToTenant[host] || 'reasonex';
    next();
};
```

---

## Summary Table

| Factor | Option 1: Shared | Option 2: Isolated | Option 3: Hybrid |
|--------|------------------|-------------------|------------------|
| **Cost** | 💰 Low ($35/mo) | 💰💰💰 High ($175/mo for 5) | 💰💰 Medium |
| **Maintenance** | ⭐⭐⭐ Easy | ⭐ Hard | ⭐⭐ Medium |
| **Security** | ⭐⭐ Good (RLS) | ⭐⭐⭐ Excellent | ⭐⭐⭐ Excellent |
| **Customization** | ⭐ Limited | ⭐⭐⭐ Full | ⭐⭐ Medium |
| **Scalability** | ⭐⭐⭐ High | ⭐⭐ Medium | ⭐⭐ Medium |
| **Compliance** | ⚠️ Logical separation | ✅ Physical separation | ✅ Physical separation |
| **Time to Deploy** | ⭐⭐⭐ Fast | ⭐ Slow | ⭐⭐ Medium |

---

## Final Recommendation

### For Your Use Case: **Option 1 (Shared Backend + Database)** ✅

**Why?**

1. **You're a SaaS Platform**: Multiple customers, standardized features
2. **Cost-Effective**: Best ROI for startup/growth phase
3. **Fast Onboarding**: Deploy new frontend in 1 hour per customer
4. **Easy Maintenance**: Fix bugs once, all customers benefit
5. **Your Schema is Ready**: Already has proper structure for multi-tenancy

**When to Switch to Option 2**:
- Enterprise client requires physical data separation
- Customer needs custom backend features
- Regulatory compliance demands it
- You have budget for higher infrastructure costs

---

## Next Steps

If you choose **Option 1**, I can help you:

1. ✅ Create the database migration script (002_add_multi_tenant_support.sql)
2. ✅ Update backend server.js with tenant middleware
3. ✅ Modify all API endpoints to include tenant filtering
4. ✅ Create deployment guide for new customer frontends
5. ✅ Add Row-Level Security policies
6. ✅ Write testing scripts to verify tenant isolation

Let me know if you want to proceed with Option 1 (multi-tenant), and I'll implement it for you!

---

**Last Updated**: 2026-01-08
**Current System**: Single tenant (Reasonex)
**Recommendation**: Multi-tenant shared backend (Option 1)
