-- Migration: Add Multi-Tenant Support
-- Date: 2026-01-08
-- Description: Adds tenant isolation to support multiple customers on shared backend/database

-- ========================================
-- Step 1: Create Tenants Table
-- ========================================

CREATE TABLE IF NOT EXISTS tenants (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    domain VARCHAR(255) UNIQUE,           -- Custom domain (e.g., customera.com)
    subdomain VARCHAR(100) UNIQUE,        -- Subdomain (e.g., customera.reasonex.com)
    settings JSONB DEFAULT '{}',          -- Customer-specific settings
    created_at TIMESTAMP DEFAULT NOW(),
    active BOOLEAN DEFAULT TRUE
);

-- Add comments
COMMENT ON TABLE tenants IS 'Customer/tenant organizations using the platform';
COMMENT ON COLUMN tenants.domain IS 'Custom domain for tenant (e.g., customera.com)';
COMMENT ON COLUMN tenants.subdomain IS 'Subdomain for tenant (e.g., customera -> customera.reasonex.com)';
COMMENT ON COLUMN tenants.settings IS 'JSON settings: branding, features, limits, etc.';

-- ========================================
-- Step 2: Add tenant_id to All Tables
-- ========================================

-- Clients table
ALTER TABLE clients ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(50) NOT NULL DEFAULT 'reasonex';

-- Jobs table
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(50) NOT NULL DEFAULT 'reasonex';

-- Candidates table
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(50) NOT NULL DEFAULT 'reasonex';

-- App Users table (team members)
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(50) NOT NULL DEFAULT 'reasonex';

-- Authorized Users table (login access)
ALTER TABLE authorized_users ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(50) NOT NULL DEFAULT 'reasonex';

-- Audit Logs table
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(50) NOT NULL DEFAULT 'reasonex';

-- Add comments
COMMENT ON COLUMN clients.tenant_id IS 'Tenant this client belongs to';
COMMENT ON COLUMN jobs.tenant_id IS 'Tenant this job/project belongs to';
COMMENT ON COLUMN candidates.tenant_id IS 'Tenant this candidate belongs to';
COMMENT ON COLUMN app_users.tenant_id IS 'Tenant this team member belongs to';
COMMENT ON COLUMN authorized_users.tenant_id IS 'Tenant this user can access';
COMMENT ON COLUMN audit_logs.tenant_id IS 'Tenant this audit event belongs to';

-- ========================================
-- Step 3: Create Foreign Key Constraints
-- ========================================

-- Update authorized_users primary key to composite (email, tenant_id)
-- This allows same email to be authorized in multiple tenants
ALTER TABLE authorized_users DROP CONSTRAINT IF EXISTS authorized_users_pkey;
ALTER TABLE authorized_users ADD PRIMARY KEY (email, tenant_id);

-- Add foreign keys to enforce tenant references
ALTER TABLE clients ADD CONSTRAINT fk_clients_tenant
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;

ALTER TABLE jobs ADD CONSTRAINT fk_jobs_tenant
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;

ALTER TABLE candidates ADD CONSTRAINT fk_candidates_tenant
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;

ALTER TABLE app_users ADD CONSTRAINT fk_users_tenant
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;

ALTER TABLE authorized_users ADD CONSTRAINT fk_authorized_tenant
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;

ALTER TABLE audit_logs ADD CONSTRAINT fk_audit_tenant
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;

-- ========================================
-- Step 4: Create Indexes for Performance
-- ========================================

CREATE INDEX IF NOT EXISTS idx_clients_tenant ON clients(tenant_id);
CREATE INDEX IF NOT EXISTS idx_jobs_tenant ON jobs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_candidates_tenant ON candidates(tenant_id);
CREATE INDEX IF NOT EXISTS idx_users_tenant ON app_users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_authorized_tenant ON authorized_users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_audit_tenant ON audit_logs(tenant_id);

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_jobs_tenant_status ON jobs(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_candidates_tenant_job ON candidates(tenant_id, job_id);
CREATE INDEX IF NOT EXISTS idx_candidates_tenant_stage ON candidates(tenant_id, stage);

-- ========================================
-- Step 5: Insert Default Tenants
-- ========================================

INSERT INTO tenants (id, name, domain, subdomain, settings) VALUES
    ('reasonex', 'Reasonex (Default)', 'app.reasonex.com', 'app', '{
        "branding": {
            "appName": "Reasonex Headhunter",
            "primaryColor": "#3B82F6",
            "logo": null
        },
        "features": {
            "linkedinSearch": true,
            "googleSearch": true,
            "intelligence": true,
            "aiAnalysis": true
        },
        "limits": {
            "maxUsers": 100,
            "maxProjects": 1000,
            "maxCandidates": 10000
        }
    }')
ON CONFLICT (id) DO NOTHING;

-- Example tenant (commented out - uncomment and modify when adding real customers)
/*
INSERT INTO tenants (id, name, domain, subdomain, settings) VALUES
    ('customer-a', 'Customer A Inc.', 'customera.com', 'customera', '{
        "branding": {
            "appName": "Customer A Recruitment",
            "primaryColor": "#10B981",
            "logo": "https://customera.com/logo.png"
        },
        "features": {
            "linkedinSearch": true,
            "googleSearch": false,
            "intelligence": true,
            "aiAnalysis": true
        },
        "limits": {
            "maxUsers": 25,
            "maxProjects": 100,
            "maxCandidates": 5000
        }
    }')
ON CONFLICT (id) DO NOTHING;
*/

-- ========================================
-- Step 6: Row-Level Security (RLS) Policies
-- ========================================

-- Enable RLS on all tables
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE authorized_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Create policy function to get current tenant from session
CREATE OR REPLACE FUNCTION get_current_tenant() RETURNS VARCHAR AS $$
BEGIN
    RETURN current_setting('app.tenant_id', true);
EXCEPTION
    WHEN OTHERS THEN RETURN 'reasonex';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create RLS policies
CREATE POLICY tenant_isolation_policy_clients ON clients
    USING (tenant_id = get_current_tenant());

CREATE POLICY tenant_isolation_policy_jobs ON jobs
    USING (tenant_id = get_current_tenant());

CREATE POLICY tenant_isolation_policy_candidates ON candidates
    USING (tenant_id = get_current_tenant());

CREATE POLICY tenant_isolation_policy_users ON app_users
    USING (tenant_id = get_current_tenant());

CREATE POLICY tenant_isolation_policy_authorized ON authorized_users
    USING (tenant_id = get_current_tenant());

CREATE POLICY tenant_isolation_policy_audit ON audit_logs
    USING (tenant_id = get_current_tenant());

-- ========================================
-- Step 7: Verification Queries
-- ========================================

-- Run these queries after migration to verify:

-- 1. Check tenants table
-- SELECT * FROM tenants;

-- 2. Verify all tables have tenant_id column
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'tenant_id';

-- 3. Check indexes
-- SELECT indexname FROM pg_indexes WHERE tablename IN ('clients', 'jobs', 'candidates') AND indexname LIKE '%tenant%';

-- 4. Verify RLS is enabled
-- SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public' AND tablename IN ('clients', 'jobs', 'candidates');

-- 5. Test tenant filtering (after setting session variable)
-- SET app.tenant_id = 'reasonex';
-- SELECT COUNT(*) FROM jobs; -- Should only show reasonex jobs

-- ========================================
-- Rollback Script (if needed)
-- ========================================

/*
-- CAUTION: This will remove multi-tenant support

-- Disable RLS
ALTER TABLE clients DISABLE ROW LEVEL SECURITY;
ALTER TABLE jobs DISABLE ROW LEVEL SECURITY;
ALTER TABLE candidates DISABLE ROW LEVEL SECURITY;
ALTER TABLE app_users DISABLE ROW LEVEL SECURITY;
ALTER TABLE authorized_users DISABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs DISABLE ROW LEVEL SECURITY;

-- Drop policies
DROP POLICY IF EXISTS tenant_isolation_policy_clients ON clients;
DROP POLICY IF EXISTS tenant_isolation_policy_jobs ON jobs;
DROP POLICY IF EXISTS tenant_isolation_policy_candidates ON candidates;
DROP POLICY IF EXISTS tenant_isolation_policy_users ON app_users;
DROP POLICY IF EXISTS tenant_isolation_policy_authorized ON authorized_users;
DROP POLICY IF EXISTS tenant_isolation_policy_audit ON audit_logs;

-- Drop function
DROP FUNCTION IF EXISTS get_current_tenant();

-- Remove foreign keys
ALTER TABLE clients DROP CONSTRAINT IF EXISTS fk_clients_tenant;
ALTER TABLE jobs DROP CONSTRAINT IF EXISTS fk_jobs_tenant;
ALTER TABLE candidates DROP CONSTRAINT IF EXISTS fk_candidates_tenant;
ALTER TABLE app_users DROP CONSTRAINT IF EXISTS fk_users_tenant;
ALTER TABLE authorized_users DROP CONSTRAINT IF EXISTS fk_authorized_tenant;
ALTER TABLE audit_logs DROP CONSTRAINT IF EXISTS fk_audit_tenant;

-- Drop indexes
DROP INDEX IF EXISTS idx_clients_tenant;
DROP INDEX IF EXISTS idx_jobs_tenant;
DROP INDEX IF EXISTS idx_candidates_tenant;
DROP INDEX IF EXISTS idx_users_tenant;
DROP INDEX IF EXISTS idx_authorized_tenant;
DROP INDEX IF EXISTS idx_audit_tenant;
DROP INDEX IF EXISTS idx_jobs_tenant_status;
DROP INDEX IF EXISTS idx_candidates_tenant_job;
DROP INDEX IF EXISTS idx_candidates_tenant_stage;

-- Remove tenant_id columns
ALTER TABLE clients DROP COLUMN IF EXISTS tenant_id;
ALTER TABLE jobs DROP COLUMN IF EXISTS tenant_id;
ALTER TABLE candidates DROP COLUMN IF EXISTS tenant_id;
ALTER TABLE app_users DROP COLUMN IF EXISTS tenant_id;
ALTER TABLE authorized_users DROP COLUMN IF EXISTS tenant_id;
ALTER TABLE audit_logs DROP COLUMN IF EXISTS tenant_id;

-- Drop tenants table
DROP TABLE IF EXISTS tenants CASCADE;
*/
