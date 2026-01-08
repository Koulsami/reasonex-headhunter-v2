# Database Migration Guide - Project Fields

## What Changed

The Search page has been redesigned to use a **project-based workflow**. Jobs now store additional project metadata:
- **Location**: Country and City
- **Experience Level**: Entry Level, Mid Level, Senior Level, Executive
- **Employment Type**: Full-time, Contract, Part-time, Temporary

## How to Apply the Migration

### Option 1: Via Railway Dashboard (Recommended)

1. Go to [Railway Dashboard](https://railway.app/dashboard)
2. Click on your **PostgreSQL** service
3. Click the **Query** tab
4. Copy the contents of `backend/migrations/001_add_project_fields_to_jobs.sql`
5. Paste into the query editor
6. Click **Run** or **Execute**

You should see a success message. The migration adds 4 new columns to the `jobs` table.

### Option 2: Via Local Node Script

```bash
# Create a quick migration script
node backend/run-migration.js
```

(Create `backend/run-migration.js` if needed - see template below)

### Option 3: Manual SQL

Connect to your Railway PostgreSQL database and run:

```sql
-- Add new columns
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS country VARCHAR(100);
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS city VARCHAR(100);
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS experience_level VARCHAR(50);
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS employment_type VARCHAR(50);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_jobs_country ON jobs(country);
CREATE INDEX IF NOT EXISTS idx_jobs_experience_level ON jobs(experience_level);
CREATE INDEX IF NOT EXISTS idx_jobs_employment_type ON jobs(employment_type);
```

## Verification

After running the migration, verify the columns exist:

```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'jobs'
ORDER BY ordinal_position;
```

You should see the new columns: `country`, `city`, `experience_level`, `employment_type`

## What Happens to Existing Jobs?

**Nothing breaks!**

- Existing jobs will have `NULL` values for the new fields
- They will still work perfectly in the Kanban board
- You can optionally update them later if needed
- New projects created via the "New Project" button will have all fields populated

## New Workflow Overview

### Before (Old Way)
1. Go to Search tab
2. Fill in: Client, Job Title, Country, City, JD
3. Search for candidates
4. Add to pipeline
5. **Repeat all fields** for another search

### After (New Way)
1. Go to Search tab
2. Click "New Project"
3. Fill in project details **once**: Client, Position, Location, Experience Level, Employment Type
4. Select the project from dropdown
5. Enter job description
6. Search for candidates
7. **Run multiple searches** with different JD variations - all candidates go to same project!

## Benefits

✅ **Less repetition**: Create project once, search many times
✅ **Better organization**: All candidates grouped by project
✅ **More metadata**: Filter by location, experience level, employment type
✅ **Flexibility**: Try different job description variations

## Rollback (If Needed)

If something goes wrong, you can rollback:

```sql
ALTER TABLE jobs DROP COLUMN IF EXISTS country;
ALTER TABLE jobs DROP COLUMN IF EXISTS city;
ALTER TABLE jobs DROP COLUMN IF EXISTS experience_level;
ALTER TABLE jobs DROP COLUMN IF EXISTS employment_type;
```

But you'll need to redeploy the previous frontend code.

---

**Migration File**: `backend/migrations/001_add_project_fields_to_jobs.sql`
**Schema Updated**: `backend/schema.sql`
**Date**: 2026-01-08
