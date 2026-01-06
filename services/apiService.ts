
import { Client, Job, Candidate, User, AuditLog, SystemStats, SystemConfig } from '../types';

// --- CONFIGURATION ---
// Detects if we are running locally or in production.
// Priority: 1) VITE env var, 2) REACT_APP env var, 3) localhost fallback
const getBackendUrl = () => {
  // Vite exposes env vars via import.meta.env
  if (import.meta.env.VITE_BACKEND_URL) {
    return import.meta.env.VITE_BACKEND_URL;
  }

  // Fallback to REACT_APP for compatibility
  if (typeof process !== 'undefined' && process.env?.REACT_APP_BACKEND_URL) {
    return process.env.REACT_APP_BACKEND_URL;
  }

  // Local development fallback
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    return 'http://localhost:3001';
  }

  // Production fallback - should not reach here if env vars are set correctly
  console.warn('No backend URL configured! Set VITE_BACKEND_URL in Railway environment variables.');
  return '';
};

const API_BASE_URL = getBackendUrl() + '/api';

let authToken: string | null = null;

/**
 * Sets the Bearer token for authenticated API requests.
 * Call this after successful Google Login.
 */
export const setApiToken = (token: string) => {
  authToken = token;
};

const getHeaders = () => {
  // Get token from localStorage with DEV_TOKEN fallback (same pattern as geminiService)
  const token = localStorage.getItem('authToken') || 'DEV_TOKEN_REASONEX';

  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };
};

// --- MOCK DATA STORE ---
// Used when the backend is offline or no user is logged in (Demo Mode).
const MOCK_DB = {
    users: [
        { id: 'u1', name: 'Sam Koul', role: 'Manager' as const, avatar: 'SK', color: 'bg-blue-100 text-blue-700' },
        { id: 'u2', name: 'AI Recruiter', role: 'AI' as const, avatar: 'AI', color: 'bg-purple-100 text-purple-700' },
        { id: 'u3', name: 'Priya Sharma', role: 'Recruiter' as const, avatar: 'PS', color: 'bg-green-100 text-green-700' },
        { id: 'u4', name: 'Raj Patel', role: 'Recruiter' as const, avatar: 'RP', color: 'bg-orange-100 text-orange-700' },
        { id: 'u5', name: 'Sarah Lee', role: 'Recruiter' as const, avatar: 'SL', color: 'bg-pink-100 text-pink-700' },
        { id: 'u6', name: 'James Chen', role: 'Recruiter' as const, avatar: 'JC', color: 'bg-teal-100 text-teal-700' }
    ],
    clients: [
        { id: 'c1', name: 'Acme Corp', industry: 'Tech', website: 'acme.com' },
        { id: 'c2', name: 'Globex Inc', industry: 'Manufacturing', website: 'globex.com' }
    ],
    jobs: [
        { id: 'j1', clientId: 'c1', title: 'Senior Engineer', status: 'Active' as const, createdAt: new Date().toISOString() },
        { id: 'j2', clientId: 'c2', title: 'Product Manager', status: 'Active' as const, createdAt: new Date().toISOString() }
    ],
    candidates: [
        { 
            id: 'cand1', 
            jobId: 'j1', 
            name: 'Alice Dev', 
            role: 'Senior Engineer', 
            company: 'Tech Co', 
            stage: 'Identified' as const, 
            matchScore: 85, 
            email: 'alice@test.com', 
            addedAt: new Date().toISOString(),
            source: 'Manual' as const
        },
        { 
            id: 'cand2', 
            jobId: 'j1', 
            name: 'Bob Coder', 
            role: 'Backend Dev', 
            company: 'Startup Inc', 
            stage: 'Screening' as const, 
            matchScore: 92, 
            email: 'bob@test.com', 
            addedAt: new Date().toISOString(),
            source: 'LinkedIn' as const
        }
    ]
};

/**
 * Returns synchronous mock data. Useful for initialization before API calls complete.
 */
export const getMockDataSync = () => {
    return {
        clients: MOCK_DB.clients,
        jobs: MOCK_DB.jobs,
        candidates: MOCK_DB.candidates,
        users: MOCK_DB.users,
        allowedEmails: ['admin@reasonex.com'],
        config: { linkedinApiUrl: '', jobAlertsApiUrl: '', googleSearchEnabled: true }
    };
};

export const api = {
  /**
   * Loads initial dashboard data.
   * Logic:
   * 1. If running on localhost with no token, return Mock Data immediately.
   * 2. Try fetching from Backend.
   * 3. If Backend fails (offline), fall back to Mock Data.
   */
  fetchInitialData: async () => {
    const token = localStorage.getItem('authToken');
    if (!token && window.location.hostname === 'localhost') {
        return getMockDataSync();
    }

    try {
        const response = await fetch(`${API_BASE_URL}/init`, { headers: getHeaders() });
        
        if (!response.ok) {
            console.warn("Backend unavailable, using mock data.");
            return getMockDataSync();
        }
        
        const data = await response.json();
        
        // Map database snake_case fields to frontend camelCase if necessary
        // (Assuming backend returns compatible structure, but mapping here for safety)
        const candidates = data.candidates.map((c: any) => ({
            id: c.id,
            jobId: c.job_id,
            assigneeId: c.assignee_id,
            name: c.name,
            role: c.current_role,
            company: c.current_company,
            stage: c.stage,
            matchScore: c.match_score,
            email: c.email,
            linkedinUrl: c.linkedin_url,
            source: c.source,
            addedAt: c.added_at,
            ...(c.ai_analysis || {})
        }));

        const jobs = data.jobs.map((j: any) => ({
            id: j.id,
            clientId: j.client_id,
            assigneeId: j.assignee_id,
            title: j.title,
            description: j.description,
            status: j.status,
            createdAt: j.created_at
        }));

        return { ...data, candidates, jobs };
    } catch (e) {
        console.error("API Init Failed", e);
        return getMockDataSync();
    }
  },

  // --- Admin Methods ---

  addAllowedUser: async (email: string) => {
    try {
        await fetch(`${API_BASE_URL}/admin/users`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify({ email })
        });
    } catch(e) { console.warn("Mock: addAllowedUser success"); }
  },

  removeAllowedUser: async (email: string) => {
    try {
        await fetch(`${API_BASE_URL}/admin/users/${email}`, {
            method: 'DELETE',
            headers: getHeaders()
        });
    } catch(e) { console.warn("Mock: removeAllowedUser success"); }
  },

  fetchAuditLogs: async (): Promise<AuditLog[]> => {
    try {
        const response = await fetch(`${API_BASE_URL}/admin/logs`, { headers: getHeaders() });
        if (!response.ok) return [];
        return response.json();
    } catch (e) { return []; }
  },

  fetchSystemStats: async (): Promise<SystemStats> => {
    try {
        const response = await fetch(`${API_BASE_URL}/admin/stats`, { headers: getHeaders() });
        if (!response.ok) throw new Error('Failed to fetch stats');
        return response.json();
    } catch (e) {
        // Fallback stats
        return { totalCandidates: 0, totalJobs: 0, activeJobs: 0, totalClients: 0, apiCallsLast24h: 0 };
    }
  },

  updateSystemConfig: async (config: SystemConfig) => {
    try {
        const response = await fetch(`${API_BASE_URL}/admin/config`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify(config)
        });
        if (!response.ok) throw new Error('Failed to update config');
    } catch(e) {
        console.warn("Config update failed (backend might be offline)");
    }
  },

  // --- Sync/Operational Methods ---
  // These fire-and-forget methods sync UI state to the DB.

  upsertClient: async (client: Client) => {
    try {
        await fetch(`${API_BASE_URL}/clients`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify(client)
        });
    } catch(e) {}
  },

  upsertJob: async (job: Job) => {
    try {
        await fetch(`${API_BASE_URL}/jobs`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify(job)
        });
    } catch(e) {}
  },

  upsertCandidate: async (candidate: Candidate) => {
    try {
        await fetch(`${API_BASE_URL}/candidates`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify(candidate)
        });
    } catch(e) {}
  },

  deleteCandidate: async (id: string) => {
    try {
        await fetch(`${API_BASE_URL}/candidates/${id}`, {
            method: 'DELETE',
            headers: getHeaders()
        });
    } catch(e) {}
  }
};
