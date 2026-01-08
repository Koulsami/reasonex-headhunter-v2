# API Endpoints - Multi-Tenant Updates

This document outlines all the changes needed to make API endpoints tenant-aware.

## Pattern for Updates

### INSERT Operations
```javascript
// OLD
INSERT INTO table (id, field1, field2) VALUES ($1, $2, $3)

// NEW
INSERT INTO table (id, field1, field2, tenant_id) VALUES ($1, $2, $3, $4)
// Add req.tenantId to parameters array
```

### UPDATE Operations
```javascript
// OLD
UPDATE table SET field1=$1 WHERE id=$2

// NEW
UPDATE table SET field1=$1 WHERE id=$2 AND tenant_id=$3
```

### SELECT Operations
```javascript
// OLD
SELECT * FROM table WHERE id=$1

// NEW
SELECT * FROM table WHERE id=$1 AND tenant_id=$2
```

### DELETE Operations
```javascript
// OLD
DELETE FROM table WHERE id=$1

// NEW
DELETE FROM table WHERE id=$1 AND tenant_id=$2
```

## Updates Needed by Endpoint

### 1. POST /api/jobs (Line ~299)

**Current**:
```javascript
await pool.query(
    `INSERT INTO jobs (id, client_id, assignee_id, title, description, status, created_at, country, city, experience_level, employment_type)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
     ON CONFLICT (id) DO UPDATE SET status=$6, assignee_id=$3, country=$8, city=$9, experience_level=$10, employment_type=$11`,
    [id, clientId, assigneeId, title, description, status, createdAt, country, city, experienceLevel, employmentType]
);
```

**Updated**:
```javascript
await pool.query(
    `INSERT INTO jobs (id, client_id, assignee_id, title, description, status, created_at, country, city, experience_level, employment_type, tenant_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
     ON CONFLICT (id) DO UPDATE SET status=$6, assignee_id=$3, country=$8, city=$9, experience_level=$10, employment_type=$11
     WHERE jobs.tenant_id = $12`,
    [id, clientId, assigneeId, title, description, status, createdAt, country, city, experienceLevel, employmentType, req.tenantId]
);
```

### 2. POST /api/candidates (Line ~316)

**Current**:
```javascript
await pool.query(
    `INSERT INTO candidates (id, job_id, assignee_id, name, "current_role", "current_company", stage, match_score, email, linkedin_url, source, added_at, ai_analysis)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
     ON CONFLICT (id) DO UPDATE SET stage=$7, assignee_id=$3, match_score=$8`,
    [id, jobId, assigneeId, name, role, company, stage, matchScore, email, linkedinUrl, source, addedAt, aiAnalysis]
);
```

**Updated**:
```javascript
await pool.query(
    `INSERT INTO candidates (id, job_id, assignee_id, name, "current_role", "current_company", stage, match_score, email, linkedin_url, source, added_at, ai_analysis, tenant_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
     ON CONFLICT (id) DO UPDATE SET stage=$7, assignee_id=$3, match_score=$8
     WHERE candidates.tenant_id = $14`,
    [id, jobId, assigneeId, name, role, company, stage, matchScore, email, linkedinUrl, source, addedAt, aiAnalysis, req.tenantId]
);
```

### 3. DELETE /api/candidates/:id (Line ~333)

**Current**:
```javascript
await pool.query('DELETE FROM candidates WHERE id = $1', [req.params.id]);
```

**Updated**:
```javascript
await pool.query(
    'DELETE FROM candidates WHERE id = $1 AND tenant_id = $2',
    [req.params.id, req.tenantId]
);
```

### 4. DELETE /api/jobs/:id (Line ~340)

**Current**:
```javascript
const jobResult = await pool.query('SELECT title FROM jobs WHERE id = $1', [req.params.id]);
await pool.query('DELETE FROM jobs WHERE id = $1', [req.params.id]);
```

**Updated**:
```javascript
const jobResult = await pool.query(
    'SELECT title FROM jobs WHERE id = $1 AND tenant_id = $2',
    [req.params.id, req.tenantId]
);
await pool.query(
    'DELETE FROM jobs WHERE id = $1 AND tenant_id = $2',
    [req.params.id, req.tenantId]
);
```

### 5. POST /api/users (Line ~353)

**Current**:
```javascript
await pool.query(
    `INSERT INTO app_users (id, name, role, avatar, color, created_at)
     VALUES ($1, $2, $3, $4, $5, NOW())
     ON CONFLICT (id) DO UPDATE SET name=$2, role=$3, avatar=$4, color=$5`,
    [id, name, role, avatar, color]
);
```

**Updated**:
```javascript
await pool.query(
    `INSERT INTO app_users (id, name, role, avatar, color, created_at, tenant_id)
     VALUES ($1, $2, $3, $4, $5, NOW(), $6)
     ON CONFLICT (id) DO UPDATE SET name=$2, role=$3, avatar=$4, color=$5
     WHERE app_users.tenant_id = $6`,
    [id, name, role, avatar, color, req.tenantId]
);
```

### 6. DELETE /api/users/:id (Line ~365)

**Current**:
```javascript
const userResult = await pool.query('SELECT name FROM app_users WHERE id = $1', [req.params.id]);
await pool.query('DELETE FROM app_users WHERE id = $1', [req.params.id]);
```

**Updated**:
```javascript
const userResult = await pool.query(
    'SELECT name FROM app_users WHERE id = $1 AND tenant_id = $2',
    [req.params.id, req.tenantId]
);
await pool.query(
    'DELETE FROM app_users WHERE id = $1 AND tenant_id = $2',
    [req.params.id, req.tenantId]
);
```

### 7. POST /api/clients (Line ~256)

**Current**:
```javascript
await pool.query(
    'INSERT INTO clients (id, name, industry, website, created_at) VALUES ($1, $2, $3, $4, NOW()) ON CONFLICT (id) DO UPDATE SET name=$2, industry=$3, website=$4',
    [id, name, industry, website]
);
```

**Updated**:
```javascript
await pool.query(
    'INSERT INTO clients (id, name, industry, website, created_at, tenant_id) VALUES ($1, $2, $3, $4, NOW(), $5) ON CONFLICT (id) DO UPDATE SET name=$2, industry=$3, website=$4 WHERE clients.tenant_id = $5',
    [id, name, industry, website, req.tenantId]
);
```

### 8. POST /api/auth/add-email (Admin) (Line ~377)

**Current**:
```javascript
await pool.query(
    'INSERT INTO authorized_users (email, role) VALUES ($1, $2) ON CONFLICT (email) DO UPDATE SET role=$2',
    [email, role]
);
```

**Updated**:
```javascript
await pool.query(
    'INSERT INTO authorized_users (email, role, tenant_id) VALUES ($1, $2, $3) ON CONFLICT (email, tenant_id) DO UPDATE SET role=$2',
    [email, role, req.tenantId]
);
```

### 9. DELETE /api/auth/remove-email (Admin) (Line ~386)

**Current**:
```javascript
await pool.query('DELETE FROM authorized_users WHERE email = $1', [email]);
```

**Updated**:
```javascript
await pool.query(
    'DELETE FROM authorized_users WHERE email = $1 AND tenant_id = $2',
    [email, req.tenantId]
);
```

### 10. GET /api/load-all (Line ~108)

**Current**:
```javascript
const [clientsRes, jobsRes, candidatesRes, usersRes, authUsersRes] = await Promise.all([
    pool.query('SELECT * FROM clients'),
    pool.query('SELECT * FROM jobs'),
    pool.query('SELECT * FROM candidates'),
    pool.query('SELECT * FROM app_users'),
    pool.query('SELECT * FROM authorized_users')
]);
```

**Updated**:
```javascript
const [clientsRes, jobsRes, candidatesRes, usersRes, authUsersRes] = await Promise.all([
    pool.query('SELECT * FROM clients WHERE tenant_id = $1', [req.tenantId]),
    pool.query('SELECT * FROM jobs WHERE tenant_id = $1', [req.tenantId]),
    pool.query('SELECT * FROM candidates WHERE tenant_id = $1', [req.tenantId]),
    pool.query('SELECT * FROM app_users WHERE tenant_id = $1', [req.tenantId]),
    pool.query('SELECT * FROM authorized_users WHERE tenant_id = $1', [req.tenantId])
]);
```

### 11. POST /api/update-config (Admin) (Line ~397)

**Current**:
```javascript
await pool.query(
    'INSERT INTO system_config (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value=$2, updated_at=NOW()',
    [key, value]
);
```

**System config is GLOBAL (not tenant-specific) - NO CHANGE NEEDED**

### 12. GET /api/audit-logs (Admin) (Line ~408)

**Current**:
```javascript
const result = await pool.query('SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 100');
```

**Updated**:
```javascript
const result = await pool.query(
    'SELECT * FROM audit_logs WHERE tenant_id = $1 ORDER BY created_at DESC LIMIT 100',
    [req.tenantId]
);
```

### 13. logAudit Function (Line ~90)

**Current**:
```javascript
const logAudit = async (email, eventType, resourceType, resourceId, payload) => {
  try {
    await pool.query(
      'INSERT INTO audit_logs (actor_email, event_type, resource_type, resource_id, payload) VALUES ($1, $2, $3, $4, $5)',
      [email, eventType, resourceType, resourceId, payload]
    );
  } catch (e) {
    console.error('Audit Log Failed:', e.message);
  }
};
```

**Updated**:
```javascript
const logAudit = async (email, eventType, resourceType, resourceId, payload, tenantId) => {
  try {
    await pool.query(
      'INSERT INTO audit_logs (actor_email, event_type, resource_type, resource_id, payload, tenant_id) VALUES ($1, $2, $3, $4, $5, $6)',
      [email, eventType, resourceType, resourceId, payload, tenantId]
    );
  } catch (e) {
    console.error('Audit Log Failed:', e.message);
  }
};
```

**All logAudit() calls need to pass req.tenantId as last parameter**

## Summary

**Total Updates Needed**: ~30 SQL queries across 13 endpoints + 1 function

**Affected Tables**:
- ✅ clients
- ✅ jobs
- ✅ candidates
- ✅ app_users
- ✅ authorized_users
- ✅ audit_logs
- ⛔ system_config (global, not tenant-specific)

**Security Notes**:
- All INSERT operations must include tenant_id
- All UPDATE/DELETE operations must include AND tenant_id = $N
- All SELECT operations should filter by tenant_id
- logAudit must log tenant_id for compliance

## Testing Checklist

After updating all endpoints:

- [ ] Create test tenant in database
- [ ] Test creating jobs/candidates with X-Tenant-Id header
- [ ] Verify cross-tenant isolation (can't access other tenant's data)
- [ ] Test subdomain routing (customera.reasonex.com)
- [ ] Test custom domain routing (customera.com)
- [ ] Verify RLS policies are enforced
- [ ] Check audit logs include tenant_id
- [ ] Test admin operations (add/remove users)
- [ ] Verify existing 'reasonex' tenant still works
