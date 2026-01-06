
require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const { OAuth2Client } = require('google-auth-library');

const app = express();
const port = process.env.PORT || 3001;

// --- CONFIGURATION ---
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false } // Required for Railway
});

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
const ADMIN_EMAIL = 'koulsam08@gmail.com'; // Hardcoded fallback admin

// Enable CORS for all routes - Critical for cross-domain usage (Netlify -> Railway)
app.use(cors());
app.use(express.json());

// --- MIDDLEWARE: Auth & Logging ---

const verifyToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'No token provided' });

  const token = authHeader.split(' ')[1];

  // --- DEVELOPER BACKDOOR ---
  // Allows access without valid Google OAuth configuration for testing
  if (token === 'DEV_TOKEN_REASONEX') {
      req.user = { 
          email: ADMIN_EMAIL,
          name: 'Developer Admin',
          picture: ''
      };
      // Auto-whitelist admin in DB if missing during dev login
      try {
        await pool.query('INSERT INTO authorized_users (email, role) VALUES ($1, $2) ON CONFLICT DO NOTHING', [ADMIN_EMAIL, 'admin']);
      } catch (e) { 
        console.error('Dev Auto-whitelist failed (Table might not exist yet)', e.message); 
      }
      return next();
  }
  // --------------------------

  try {
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    req.user = payload;

    // Check Whitelist
    const result = await pool.query('SELECT * FROM authorized_users WHERE email = $1', [payload.email]);
    
    // Auto-allow the hardcoded admin if not in DB yet
    if (result.rows.length === 0 && payload.email !== ADMIN_EMAIL) {
       return res.status(403).json({ error: 'User not authorized', email: payload.email });
    }

    // Update last login
    if (result.rows.length > 0) {
        await pool.query('UPDATE authorized_users SET last_login_at = NOW() WHERE email = $1', [payload.email]);
    }

    next();
  } catch (error) {
    console.error('Auth Error:', error);
    return res.status(401).json({ error: 'Invalid token' });
  }
};

const verifyAdmin = async (req, res, next) => {
    if (req.user.email === ADMIN_EMAIL) return next();
    
    // Check DB role
    const result = await pool.query('SELECT role FROM authorized_users WHERE email = $1', [req.user.email]);
    if (result.rows[0] && result.rows[0].role === 'admin') {
        return next();
    }
    return res.status(403).json({ error: 'Admin access required' });
};

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

// --- ENDPOINTS ---

// Health Check
app.get('/', (req, res) => {
    res.send('Reasonex Backend is Running');
});

// 1. Initialization (Load all data for the dashboard)
app.get('/api/init', verifyToken, async (req, res) => {
  try {
    // Wrap queries in try/catch to handle cases where tables might not exist yet
    let clients = { rows: [] }, jobs = { rows: [] }, candidates = { rows: [] }, users = { rows: [] }, allowedUsers = { rows: [] };
    
    try { clients = await pool.query('SELECT * FROM clients'); } catch(e) { console.warn("Clients table missing"); }
    try { jobs = await pool.query('SELECT * FROM jobs'); } catch(e) { console.warn("Jobs table missing"); }
    try { candidates = await pool.query('SELECT * FROM candidates'); } catch(e) { console.warn("Candidates table missing"); }
    try { users = await pool.query('SELECT * FROM app_users'); } catch(e) { console.warn("Users table missing"); }
    try { allowedUsers = await pool.query('SELECT email FROM authorized_users'); } catch(e) { console.warn("Auth users table missing"); }
    
    // Fetch Config
    let config = {
        linkedinApiUrl: 'https://n8n-production-3f14.up.railway.app/webhook-test/275acb0f-4966-4205-83c8-5fc86b0e7fb1',
        jobAlertsApiUrl: 'https://n8n-production-3f14.up.railway.app/webhook/bc4a44fa-2a16-4108-acb1-34c2353e9476',
        googleSearchEnabled: true
    };
    
    try {
        const configRes = await pool.query('SELECT key, value FROM system_config');
        configRes.rows.forEach(row => {
            // Handle boolean conversion if needed
            if (row.key === 'googleSearchEnabled') {
                config[row.key] = row.value === 'true';
            } else {
                config[row.key] = row.value;
            }
        });
    } catch (e) { 
        // Table might not exist yet, ignore
    }

    res.json({
      clients: clients.rows,
      jobs: jobs.rows,
      candidates: candidates.rows,
      users: users.rows,
      allowedEmails: allowedUsers.rows.map(r => r.email),
      config
    });
  } catch (err) {
    console.error("Init Error:", err);
    res.status(500).json({ error: err.message });
  }
});

// 2. Admin Management (Users)
app.post('/api/admin/users', verifyToken, verifyAdmin, async (req, res) => {
  const { email } = req.body;
  try {
    await pool.query('INSERT INTO authorized_users (email, role) VALUES ($1, $2) ON CONFLICT DO NOTHING', [email, 'user']);
    await logAudit(req.user.email, 'ADD_USER', 'auth', null, { added_email: email });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/admin/users/:email', verifyToken, verifyAdmin, async (req, res) => {
  if (req.params.email === ADMIN_EMAIL) return res.status(400).json({ error: "Cannot delete super admin" });
  
  try {
    await pool.query('DELETE FROM authorized_users WHERE email = $1', [req.params.email]);
    await logAudit(req.user.email, 'REMOVE_USER', 'auth', null, { removed_email: req.params.email });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. Admin Reporting & Logs
app.get('/api/admin/logs', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 50');
        res.json(result.rows);
    } catch (err) { res.status(500).json(err); }
});

app.get('/api/admin/stats', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const cCount = await pool.query('SELECT count(*) FROM candidates');
        const jCount = await pool.query('SELECT count(*) FROM jobs');
        const jActive = await pool.query('SELECT count(*) FROM jobs WHERE status = \'Active\'');
        const clCount = await pool.query('SELECT count(*) FROM clients');
        const apiCalls = await pool.query("SELECT count(*) FROM audit_logs WHERE created_at > NOW() - INTERVAL '24 HOURS'");

        res.json({
            totalCandidates: parseInt(cCount.rows[0].count),
            totalJobs: parseInt(jCount.rows[0].count),
            activeJobs: parseInt(jActive.rows[0].count),
            totalClients: parseInt(clCount.rows[0].count),
            apiCallsLast24h: parseInt(apiCalls.rows[0].count)
        });
    } catch (err) { res.status(500).json(err); }
});

app.post('/api/admin/config', verifyToken, verifyAdmin, async (req, res) => {
    const { linkedinApiUrl, jobAlertsApiUrl, googleSearchEnabled } = req.body;
    try {
        const queries = [
            pool.query('INSERT INTO system_config (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value=$2', ['linkedinApiUrl', linkedinApiUrl]),
            pool.query('INSERT INTO system_config (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value=$2', ['jobAlertsApiUrl', jobAlertsApiUrl]),
            pool.query('INSERT INTO system_config (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value=$2', ['googleSearchEnabled', String(googleSearchEnabled)])
        ];
        await Promise.all(queries);
        
        await logAudit(req.user.email, 'UPDATE_CONFIG', 'system', null, { linkedinApiUrl });
        res.json({ success: true });
    } catch (err) { 
        console.error(err);
        res.status(500).json({ error: "Failed to save config." }); 
    }
});

// 4. Operational Endpoints (Sync Logic)

app.post('/api/clients', verifyToken, async (req, res) => {
    const { id, name, industry, website } = req.body;
    try {
        await pool.query(
            'INSERT INTO clients (id, name, industry, website) VALUES ($1, $2, $3, $4) ON CONFLICT (id) DO UPDATE SET name=$2, industry=$3, website=$4',
            [id, name, industry, website]
        );
        res.json({ success: true });
    } catch(err) { res.status(500).json(err); }
});

app.post('/api/jobs', verifyToken, async (req, res) => {
    const { id, clientId, assigneeId, title, description, status, createdAt } = req.body;
    try {
        await pool.query(
            'INSERT INTO jobs (id, client_id, assignee_id, title, description, status, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT (id) DO UPDATE SET status=$6, assignee_id=$3',
            [id, clientId, assigneeId, title, description, status, createdAt]
        );
        await logAudit(req.user.email, 'UPSERT_JOB', 'job', id, { title });
        res.json({ success: true });
    } catch(err) { res.status(500).json(err); }
});

app.post('/api/candidates', verifyToken, async (req, res) => {
    const { id, jobId, assigneeId, name, role, company, stage, matchScore, email, linkedinUrl, source, addedAt, fitLevel, strengths, concerns, summary } = req.body;
    
    const aiAnalysis = JSON.stringify({ fitLevel, strengths, concerns, summary });

    try {
        await pool.query(
            `INSERT INTO candidates (id, job_id, assignee_id, name, current_role, current_company, stage, match_score, email, linkedin_url, source, added_at, ai_analysis) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
             ON CONFLICT (id) DO UPDATE SET stage=$7, assignee_id=$3, match_score=$8`,
            [id, jobId, assigneeId, name, role, company, stage, matchScore, email, linkedinUrl, source, addedAt, aiAnalysis]
        );
        await logAudit(req.user.email, 'UPSERT_CANDIDATE', 'candidate', id, { name, stage });
        res.json({ success: true });
    } catch(err) { res.status(500).json(err); }
});

app.delete('/api/candidates/:id', verifyToken, async (req, res) => {
    try {
        await pool.query('DELETE FROM candidates WHERE id = $1', [req.params.id]);
        await logAudit(req.user.email, 'DELETE_CANDIDATE', 'candidate', req.params.id, {});
        res.json({ success: true });
    } catch(err) { res.status(500).json(err); }
});

// --- LINKEDIN PROXY ENDPOINT ---
// Proxies requests to N8N webhook to avoid CORS issues
app.post('/api/linkedin-search', verifyToken, async (req, res) => {
    try {
        const { job_context, country, num_candidates_analyze, num_candidates_output } = req.body;

        // Get LinkedIn API URL from system config
        const configResult = await pool.query('SELECT linkedin_api_url FROM system_config LIMIT 1');
        const linkedinApiUrl = configResult.rows[0]?.linkedin_api_url ||
            'https://n8n-production-3f14.up.railway.app/webhook-test/275acb0f-4966-4205-83c8-5fc86b0e7fb1';

        console.log('Proxying LinkedIn search to:', linkedinApiUrl);

        // Forward request to N8N webhook
        const fetch = require('node-fetch');
        const response = await fetch(linkedinApiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                job_context,
                country,
                num_candidates_analyze,
                num_candidates_output,
                search_mode: "wide"
            })
        });

        if (!response.ok) {
            throw new Error(`N8N API returned ${response.status}`);
        }

        const data = await response.json();
        await logAudit(req.user.email, 'LINKEDIN_SEARCH', 'search', null, { country, candidates_output: num_candidates_output });

        res.json(data);
    } catch(err) {
        console.error('LinkedIn search proxy error:', err);
        res.status(500).json({ error: err.message });
    }
});

app.listen(port, () => {
  console.log(`Backend running on port ${port}`);
});
