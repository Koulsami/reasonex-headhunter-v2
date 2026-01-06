# Database Setup Instructions

## Quick Setup on Railway

1. **Connect to your PostgreSQL database** via Railway's dashboard or using psql:
   ```bash
   psql postgresql://username:password@host:port/database
   ```

2. **Run the schema script**:
   ```bash
   psql postgresql://your-connection-string < backend/schema.sql
   ```

   Or copy-paste the contents of `schema.sql` into Railway's PostgreSQL Query tab.

3. **Verify tables were created**:
   ```sql
   \dt
   ```

   You should see: `clients`, `jobs`, `candidates`, `authorized_users`, `app_users`, `system_config`, `audit_logs`

## What Gets Created

- **system_config**: Stores LinkedIn API URL, Job Alerts webhook URL, and feature flags
- **authorized_users**: Email whitelist for access control (role: admin or user)
- **app_users**: Internal team members (for assignment tracking)
- **clients**: Client companies
- **jobs**: Job requisitions linked to clients
- **candidates**: Candidate records linked to jobs
- **audit_logs**: Activity tracking for compliance

## Default Data

The schema includes:
- Default admin user: `koulsam08@gmail.com`
- Two app users: "Sam Koul" (Manager) and "AI Recruiter" (AI)
- Default N8N webhook URLs for LinkedIn search and job alerts

## Troubleshooting

**500 errors on /api/admin endpoints?**
- Tables don't exist yet. Run schema.sql.

**Permission errors?**
- Ensure your Railway PostgreSQL user has CREATE and INSERT privileges.

**Tables already exist?**
- The script includes `DROP TABLE IF EXISTS` - it will recreate everything fresh.
- **WARNING**: This will delete all existing data. Comment out DROP statements if you want to preserve data.
