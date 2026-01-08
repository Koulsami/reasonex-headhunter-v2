-- Migration: Add Project Fields to Jobs Table
-- Date: 2026-01-08
-- Description: Adds location, experience level, and employment type fields to support project-based workflow

-- Add new columns to jobs table
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS country VARCHAR(100);
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS city VARCHAR(100);
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS experience_level VARCHAR(50);
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS employment_type VARCHAR(50);

-- Add comments for documentation
COMMENT ON COLUMN jobs.country IS 'Location country for the job/project';
COMMENT ON COLUMN jobs.city IS 'Location city for the job/project (optional)';
COMMENT ON COLUMN jobs.experience_level IS 'Experience level: Entry Level, Mid Level, Senior Level, Executive';
COMMENT ON COLUMN jobs.employment_type IS 'Employment type: Full-time, Contract, Part-time, Temporary';

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_jobs_country ON jobs(country);
CREATE INDEX IF NOT EXISTS idx_jobs_experience_level ON jobs(experience_level);
CREATE INDEX IF NOT EXISTS idx_jobs_employment_type ON jobs(employment_type);
