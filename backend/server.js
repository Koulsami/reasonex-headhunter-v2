
require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const { OAuth2Client } = require('google-auth-library');
const fetch = require('node-fetch');

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
        // Default values if tables don't exist
        let stats = {
            totalCandidates: 0,
            totalJobs: 0,
            activeJobs: 0,
            totalClients: 0,
            apiCallsLast24h: 0
        };

        try {
            const cCount = await pool.query('SELECT count(*) FROM candidates');
            stats.totalCandidates = parseInt(cCount.rows[0].count);
        } catch(e) { console.warn('Candidates table not found'); }

        try {
            const jCount = await pool.query('SELECT count(*) FROM jobs');
            stats.totalJobs = parseInt(jCount.rows[0].count);
        } catch(e) { console.warn('Jobs table not found'); }

        try {
            const jActive = await pool.query('SELECT count(*) FROM jobs WHERE status = \'Active\'');
            stats.activeJobs = parseInt(jActive.rows[0].count);
        } catch(e) { /* Already warned above */ }

        try {
            const clCount = await pool.query('SELECT count(*) FROM clients');
            stats.totalClients = parseInt(clCount.rows[0].count);
        } catch(e) { console.warn('Clients table not found'); }

        try {
            const apiCalls = await pool.query("SELECT count(*) FROM audit_logs WHERE created_at > NOW() - INTERVAL '24 HOURS'");
            stats.apiCallsLast24h = parseInt(apiCalls.rows[0].count);
        } catch(e) { console.warn('Audit logs table not found'); }

        res.json(stats);
    } catch (err) {
        console.error('Stats error:', err);
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/admin/config', verifyToken, verifyAdmin, async (req, res) => {
    const { linkedinApiUrl, jobAlertsApiUrl, googleSearchEnabled } = req.body;
    try {
        // Try to save config to database
        try {
            const queries = [
                pool.query('INSERT INTO system_config (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value=$2', ['linkedinApiUrl', linkedinApiUrl]),
                pool.query('INSERT INTO system_config (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value=$2', ['jobAlertsApiUrl', jobAlertsApiUrl]),
                pool.query('INSERT INTO system_config (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value=$2', ['googleSearchEnabled', String(googleSearchEnabled)])
            ];
            await Promise.all(queries);
        } catch (configErr) {
            console.warn('Config table not found - config not persisted. Run schema.sql to create tables.');
            // Continue anyway - config will work in memory for this session
        }

        // Try to log audit (optional)
        try {
            await logAudit(req.user.email, 'UPDATE_CONFIG', 'system', null, { linkedinApiUrl });
        } catch (auditErr) {
            console.warn('Audit log table not found');
        }

        res.json({
            success: true,
            warning: 'Config saved to memory only. Run database schema to persist configuration.'
        });
    } catch (err) {
        console.error('Config update error:', err);
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
    console.log('=== LINKEDIN SEARCH REQUEST START ===');
    console.log('Request body:', JSON.stringify(req.body, null, 2));

    try {
        const { job_context, country, num_candidates_analyze, num_candidates_output } = req.body;

        // Get LinkedIn API URL from system config (with fallback if table doesn't exist)
        let linkedinApiUrl = 'https://n8n-production-3f14.up.railway.app/webhook-test/275acb0f-4966-4205-83c8-5fc86b0e7fb1';
        try {
            const configResult = await pool.query("SELECT value FROM system_config WHERE key = 'linkedinApiUrl'");
            if (configResult.rows[0]?.value) {
                linkedinApiUrl = configResult.rows[0].value;
                console.log('Using config URL from database:', linkedinApiUrl);
            }
        } catch (configErr) {
            console.warn('Config table not found, using default LinkedIn URL');
        }

        console.log('Final LinkedIn API URL:', linkedinApiUrl);
        console.log('About to call node-fetch...');

        // Forward request to N8N webhook
        console.log('Calling fetch with payload:', {
            job_context: job_context?.substring(0, 100) + '...',
            country,
            num_candidates_analyze,
            num_candidates_output,
            search_mode: "wide"
        });

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

        console.log('N8N Response status:', response.status);
        console.log('N8N Response ok:', response.ok);

        if (!response.ok) {
            const errorText = await response.text();
            console.error('N8N Error response:', errorText);
            throw new Error(`N8N API returned ${response.status}: ${errorText}`);
        }

        const data = await response.json();
        console.log('N8N Response data received, candidate count:', data?.results?.length || data?.[0]?.results?.length || 'unknown');

        // Log audit (ignore if table doesn't exist)
        try {
            await logAudit(req.user.email, 'LINKEDIN_SEARCH', 'search', null, { country, candidates_output: num_candidates_output });
        } catch (auditErr) {
            console.warn('Audit log failed (table may not exist yet)');
        }

        console.log('=== LINKEDIN SEARCH REQUEST SUCCESS ===');
        res.json(data);
    } catch(err) {
        console.error('=== LINKEDIN SEARCH REQUEST FAILED ===');
        console.error('Error type:', err.constructor.name);
        console.error('Error message:', err.message);
        console.error('Error stack:', err.stack);
        res.status(500).json({
            error: err.message,
            errorType: err.constructor.name,
            details: 'Check Railway backend logs for full error trace'
        });
    }
});

app.listen(port, () => {
  console.log(`Backend running on port ${port}`);
});
