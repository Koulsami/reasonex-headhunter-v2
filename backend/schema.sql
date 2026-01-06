-- Reasonex Headhunter V2 Database Schema
-- Run this script on your Railway PostgreSQL database

-- Drop existing tables if they exist (be careful in production!)
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS candidates CASCADE;
DROP TABLE IF EXISTS jobs CASCADE;
DROP TABLE IF EXISTS clients CASCADE;
DROP TABLE IF EXISTS authorized_users CASCADE;
DROP TABLE IF EXISTS app_users CASCADE;
DROP TABLE IF EXISTS system_config CASCADE;

-- System Configuration Table
CREATE TABLE system_config (
    key VARCHAR(255) PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Authorized Users (Access Control)
CREATE TABLE authorized_users (
    email VARCHAR(255) PRIMARY KEY,
    role VARCHAR(50) DEFAULT 'user',
    created_at TIMESTAMP DEFAULT NOW(),
    last_login_at TIMESTAMP
);

-- App Users (Internal Team Members)
CREATE TABLE app_users (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL,
    avatar VARCHAR(10),
    color VARCHAR(50),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Clients Table
CREATE TABLE clients (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    industry VARCHAR(100),
    website VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Jobs Table
CREATE TABLE jobs (
    id VARCHAR(50) PRIMARY KEY,
    client_id VARCHAR(50) REFERENCES clients(id) ON DELETE CASCADE,
    assignee_id VARCHAR(50) REFERENCES app_users(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'Active',
    created_at TIMESTAMP DEFAULT NOW()
);

-- Candidates Table
CREATE TABLE candidates (
    id VARCHAR(50) PRIMARY KEY,
    job_id VARCHAR(50) REFERENCES jobs(id) ON DELETE CASCADE,
    assignee_id VARCHAR(50) REFERENCES app_users(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    current_role VARCHAR(255),
    current_company VARCHAR(255),
    stage VARCHAR(50) DEFAULT 'Identified',
    match_score INTEGER DEFAULT 0,
    email VARCHAR(255),
    linkedin_url TEXT,
    source VARCHAR(50) DEFAULT 'Manual',
    added_at TIMESTAMP DEFAULT NOW(),
    ai_analysis JSONB
);

-- Audit Logs Table
CREATE TABLE audit_logs (
    id SERIAL PRIMARY KEY,
    actor_email VARCHAR(255) NOT NULL,
    event_type VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50),
    resource_id VARCHAR(50),
    payload JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Insert Default System Configuration
INSERT INTO system_config (key, value) VALUES
    ('linkedinApiUrl', 'https://n8n-production-3f14.up.railway.app/webhook-test/275acb0f-4966-4205-83c8-5fc86b0e7fb1'),
    ('jobAlertsApiUrl', 'https://n8n-production-3f14.up.railway.app/webhook/bc4a44fa-2a16-4108-acb1-34c2353e9476'),
    ('googleSearchEnabled', 'true')
ON CONFLICT (key) DO NOTHING;

-- Insert Default Admin User
INSERT INTO authorized_users (email, role) VALUES
    ('koulsam08@gmail.com', 'admin')
ON CONFLICT (email) DO NOTHING;

-- Insert Default App Users
INSERT INTO app_users (id, name, role, avatar, color) VALUES
    ('u1', 'Sam Koul', 'Manager', 'SK', 'bg-blue-100 text-blue-700'),
    ('u2', 'AI Recruiter', 'AI', 'AI', 'bg-purple-100 text-purple-700')
ON CONFLICT (id) DO NOTHING;

-- Create Indexes for Performance
CREATE INDEX IF NOT EXISTS idx_candidates_job_id ON candidates(job_id);
CREATE INDEX IF NOT EXISTS idx_candidates_stage ON candidates(stage);
CREATE INDEX IF NOT EXISTS idx_jobs_client_id ON jobs(client_id);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_email ON audit_logs(actor_email);

-- Grant permissions (adjust if needed for your Railway setup)
-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO your_db_user;
-- GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO your_db_user;
