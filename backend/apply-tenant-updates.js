/**
 * Script to apply multi-tenant updates to server.js
 * This script updates all SQL queries to include tenant_id filtering
 *
 * Run with: node backend/apply-tenant-updates.js
 */

const fs = require('fs');
const path = require('path');

const serverPath = path.join(__dirname, 'server.js');
let content = fs.readFileSync(serverPath, 'utf8');

console.log('Applying multi-tenant updates to server.js...\n');

// Track changes
let changeCount = 0;

// Update 1: logAudit function signature
const oldLogAudit = `const logAudit = async (email, eventType, resourceType, resourceId, payload) => {
  try {
    await pool.query(
      'INSERT INTO audit_logs (actor_email, event_type, resource_type, resource_id, payload) VALUES ($1, $2, $3, $4, $5)',
      [email, eventType, resourceType, resourceId, payload]
    );`;

const newLogAudit = `const logAudit = async (email, eventType, resourceType, resourceId, payload, tenantId = 'reasonex') => {
  try {
    await pool.query(
      'INSERT INTO audit_logs (actor_email, event_type, resource_type, resource_id, payload, tenant_id) VALUES ($1, $2, $3, $4, $5, $6)',
      [email, eventType, resourceType, resourceId, payload, tenantId]
    );`;

if (content.includes(oldLogAudit)) {
    content = content.replace(oldLogAudit, newLogAudit);
    console.log('✓ Updated logAudit function');
    changeCount++;
}

// Update all logAudit calls to include req.tenantId
content = content.replace(/await logAudit\(req\.user\.email, '([^']+)', '([^']+)', ([^,]+), \{([^}]*)\}\);/g,
    (match, eventType, resourceType, resourceId, payload) => {
        return `await logAudit(req.user.email, '${eventType}', '${resourceType}', ${resourceId}, {${payload}}, req.tenantId);`;
    });

console.log('✓ Updated logAudit() calls to include req.tenantId');
changeCount++;

// Update 2: GET /api/load-all
const oldLoadAll = `const [clientsRes, jobsRes, candidatesRes, usersRes, authUsersRes] = await Promise.all([
            pool.query('SELECT * FROM clients'),
            pool.query('SELECT * FROM jobs'),
            pool.query('SELECT * FROM candidates'),
            pool.query('SELECT * FROM app_users'),
            pool.query('SELECT * FROM authorized_users')
        ]);`;

const newLoadAll = `const [clientsRes, jobsRes, candidatesRes, usersRes, authUsersRes] = await Promise.all([
            pool.query('SELECT * FROM clients WHERE tenant_id = $1', [req.tenantId]),
            pool.query('SELECT * FROM jobs WHERE tenant_id = $1', [req.tenantId]),
            pool.query('SELECT * FROM candidates WHERE tenant_id = $1', [req.tenantId]),
            pool.query('SELECT * FROM app_users WHERE tenant_id = $1', [req.tenantId]),
            pool.query('SELECT * FROM authorized_users WHERE tenant_id = $1', [req.tenantId])
        ]);`;

if (content.includes(oldLoadAll)) {
    content = content.replace(oldLoadAll, newLoadAll);
    console.log('✓ Updated GET /api/load-all');
    changeCount++;
}

// Update 3: POST /api/clients
const oldClients = `'INSERT INTO clients (id, name, industry, website, created_at) VALUES ($1, $2, $3, $4, NOW()) ON CONFLICT (id) DO UPDATE SET name=$2, industry=$3, website=$4',
            [id, name, industry, website]`;

const newClients = `'INSERT INTO clients (id, name, industry, website, created_at, tenant_id) VALUES ($1, $2, $3, $4, NOW(), $5) ON CONFLICT (id) DO UPDATE SET name=$2, industry=$3, website=$4 WHERE clients.tenant_id = $5',
            [id, name, industry, website, req.tenantId]`;

if (content.includes(oldClients)) {
    content = content.replace(oldClients, newClients);
    console.log('✓ Updated POST /api/clients');
    changeCount++;
}

// Update 4: POST /api/jobs
const oldJobs = `\`INSERT INTO jobs (id, client_id, assignee_id, title, description, status, created_at, country, city, experience_level, employment_type)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
             ON CONFLICT (id) DO UPDATE SET status=$6, assignee_id=$3, country=$8, city=$9, experience_level=$10, employment_type=$11\`,
            [id, clientId, assigneeId, title, description, status, createdAt, country, city, experienceLevel, employmentType]`;

const newJobs = `\`INSERT INTO jobs (id, client_id, assignee_id, title, description, status, created_at, country, city, experience_level, employment_type, tenant_id)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
             ON CONFLICT (id) DO UPDATE SET status=$6, assignee_id=$3, country=$8, city=$9, experience_level=$10, employment_type=$11 WHERE jobs.tenant_id = $12\`,
            [id, clientId, assigneeId, title, description, status, createdAt, country, city, experienceLevel, employmentType, req.tenantId]`;

if (content.includes(oldJobs)) {
    content = content.replace(oldJobs, newJobs);
    console.log('✓ Updated POST /api/jobs');
    changeCount++;
}

// Update 5: POST /api/candidates
const oldCandidates = `\`INSERT INTO candidates (id, job_id, assignee_id, name, "current_role", "current_company", stage, match_score, email, linkedin_url, source, added_at, ai_analysis)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
             ON CONFLICT (id) DO UPDATE SET stage=$7, assignee_id=$3, match_score=$8\`,
            [id, jobId, assigneeId, name, role, company, stage, matchScore, email, linkedinUrl, source, addedAt, aiAnalysis]`;

const newCandidates = `\`INSERT INTO candidates (id, job_id, assignee_id, name, "current_role", "current_company", stage, match_score, email, linkedin_url, source, added_at, ai_analysis, tenant_id)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
             ON CONFLICT (id) DO UPDATE SET stage=$7, assignee_id=$3, match_score=$8 WHERE candidates.tenant_id = $14\`,
            [id, jobId, assigneeId, name, role, company, stage, matchScore, email, linkedinUrl, source, addedAt, aiAnalysis, req.tenantId]`;

if (content.includes(oldCandidates)) {
    content = content.replace(oldCandidates, newCandidates);
    console.log('✓ Updated POST /api/candidates');
    changeCount++;
}

// Update 6: DELETE /api/candidates/:id
content = content.replace(
    /'DELETE FROM candidates WHERE id = \$1', \[req\.params\.id\]/g,
    `'DELETE FROM candidates WHERE id = $1 AND tenant_id = $2', [req.params.id, req.tenantId]`
);
console.log('✓ Updated DELETE /api/candidates/:id');
changeCount++;

// Update 7: DELETE /api/jobs/:id
const oldJobDelete1 = `const jobResult = await pool.query('SELECT title FROM jobs WHERE id = $1', [req.params.id]);`;
const newJobDelete1 = `const jobResult = await pool.query('SELECT title FROM jobs WHERE id = $1 AND tenant_id = $2', [req.params.id, req.tenantId]);`;

const oldJobDelete2 = `await pool.query('DELETE FROM jobs WHERE id = $1', [req.params.id]);`;
const newJobDelete2 = `await pool.query('DELETE FROM jobs WHERE id = $1 AND tenant_id = $2', [req.params.id, req.tenantId]);`;

content = content.replace(oldJobDelete1, newJobDelete1);
content = content.replace(oldJobDelete2, newJobDelete2);
console.log('✓ Updated DELETE /api/jobs/:id');
changeCount += 2;

// Update 8: POST /api/users
const oldUsers = `\`INSERT INTO app_users (id, name, role, avatar, color, created_at)
         VALUES ($1, $2, $3, $4, $5, NOW())
         ON CONFLICT (id) DO UPDATE SET name=$2, role=$3, avatar=$4, color=$5\`,
        [id, name, role, avatar, color]`;

const newUsers = `\`INSERT INTO app_users (id, name, role, avatar, color, created_at, tenant_id)
         VALUES ($1, $2, $3, $4, $5, NOW(), $6)
         ON CONFLICT (id) DO UPDATE SET name=$2, role=$3, avatar=$4, color=$5 WHERE app_users.tenant_id = $6\`,
        [id, name, role, avatar, color, req.tenantId]`;

if (content.includes(oldUsers)) {
    content = content.replace(oldUsers, newUsers);
    console.log('✓ Updated POST /api/users');
    changeCount++;
}

// Update 9: DELETE /api/users/:id
const oldUserDelete1 = `const userResult = await pool.query('SELECT name FROM app_users WHERE id = $1', [req.params.id]);`;
const newUserDelete1 = `const userResult = await pool.query('SELECT name FROM app_users WHERE id = $1 AND tenant_id = $2', [req.params.id, req.tenantId]);`;

const oldUserDelete2 = `await pool.query('DELETE FROM app_users WHERE id = $1', [req.params.id]);`;
const newUserDelete2 = `await pool.query('DELETE FROM app_users WHERE id = $1 AND tenant_id = $2', [req.params.id, req.tenantId]);`;

content = content.replace(oldUserDelete1, newUserDelete1);
content = content.replace(oldUserDelete2, newUserDelete2);
console.log('✓ Updated DELETE /api/users/:id');
changeCount += 2;

// Update 10: POST /api/auth/add-email
const oldAddEmail = `'INSERT INTO authorized_users (email, role) VALUES ($1, $2) ON CONFLICT (email, tenant_id) DO UPDATE SET role=$2',
            [email, role]`;

const newAddEmail = `'INSERT INTO authorized_users (email, role, tenant_id) VALUES ($1, $2, $3) ON CONFLICT (email, tenant_id) DO UPDATE SET role=$2',
            [email, role, req.tenantId]`;

if (content.includes(oldAddEmail)) {
    content = content.replace(oldAddEmail, newAddEmail);
    console.log('✓ Updated POST /api/auth/add-email');
    changeCount++;
}

// Update 11: DELETE /api/auth/remove-email
content = content.replace(
    /'DELETE FROM authorized_users WHERE email = \$1', \[email\]/g,
    `'DELETE FROM authorized_users WHERE email = $1 AND tenant_id = $2', [email, req.tenantId]`
);
console.log('✓ Updated DELETE /api/auth/remove-email');
changeCount++;

// Update 12: GET /api/audit-logs
content = content.replace(
    /'SELECT \* FROM audit_logs ORDER BY created_at DESC LIMIT 100'/g,
    `'SELECT * FROM audit_logs WHERE tenant_id = $1 ORDER BY created_at DESC LIMIT 100', [req.tenantId]`
);
console.log('✓ Updated GET /api/audit-logs');
changeCount++;

// Write updated content
fs.writeFileSync(serverPath, content, 'utf8');

console.log(`\n✅ Successfully applied ${changeCount} multi-tenant updates to server.js`);
console.log('\nNext steps:');
console.log('1. Review the changes in server.js');
console.log('2. Run the database migration: backend/migrations/002_add_multi_tenant_support.sql');
console.log('3. Restart the backend server');
console.log('4. Test with: node backend/test-tenant-isolation.js');
