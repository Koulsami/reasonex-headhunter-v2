# Database Implementation Guide - Project Archive & Delete

## Overview

This guide explains how project archiving and deletion are implemented in the database, including the CASCADE behavior that ensures data integrity.

---

## 📊 Database Schema

### Jobs Table Structure

```sql
CREATE TABLE jobs (
    id VARCHAR(50) PRIMARY KEY,
    client_id VARCHAR(50) REFERENCES clients(id) ON DELETE CASCADE,
    assignee_id VARCHAR(50) REFERENCES app_users(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'Active',      -- 'Active', 'Suspended', 'Closed', 'Expired'
    created_at TIMESTAMP DEFAULT NOW(),

    -- Project-specific fields
    country VARCHAR(100),
    city VARCHAR(100),
    experience_level VARCHAR(50),
    employment_type VARCHAR(50)
);
```

### Candidates Table Structure

```sql
CREATE TABLE candidates (
    id VARCHAR(50) PRIMARY KEY,
    job_id VARCHAR(50) REFERENCES jobs(id) ON DELETE CASCADE,  -- ⚠️ CASCADE deletion
    assignee_id VARCHAR(50) REFERENCES app_users(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    "current_role" VARCHAR(255),
    "current_company" VARCHAR(255),
    stage VARCHAR(50) DEFAULT 'Identified',
    match_score INTEGER DEFAULT 0,
    email VARCHAR(255),
    linkedin_url TEXT,
    source VARCHAR(50) DEFAULT 'Manual',
    added_at TIMESTAMP DEFAULT NOW(),
    ai_analysis JSONB
);
```

**Key Point**: The `job_id` foreign key has `ON DELETE CASCADE`, meaning when a job is deleted, **all associated candidates are automatically deleted**.

---

## 🔄 Archive Implementation

### What is Archiving?

Archiving is a **soft delete** - the project is not removed from the database, just marked as inactive.

### Database Implementation

**Action**: Update the `status` field from `'Active'` to `'Suspended'`

**SQL Query**:
```sql
UPDATE jobs
SET status = 'Suspended'
WHERE id = $1;
```

**Backend Code** ([backend/server.js](backend/server.js)):
```javascript
// Archive is just a status update, uses the existing UPSERT endpoint
app.post('/api/jobs', verifyToken, async (req, res) => {
    const { id, ..., status, ... } = req.body;
    // When status = 'Suspended', project is archived
    await pool.query(
        `INSERT INTO jobs (..., status, ...)
         VALUES (...)
         ON CONFLICT (id) DO UPDATE SET status=$6, ...`,
        [id, ..., status, ...]
    );
});
```

**Frontend Code** ([App.tsx:239-248](App.tsx#L239-L248)):
```typescript
const handleArchiveJob = async (jobId: string) => {
  setJobs(prev => prev.map(j => {
    if (j.id === jobId) {
      const updated = { ...j, status: 'Suspended' as const };
      api.upsertJob(updated); // Sync to DB
      return updated;
    }
    return j;
  }));
};
```

### What Happens When Archived?

✅ **Project data preserved**: All project details remain in database
✅ **Candidates preserved**: All candidates remain linked to the project
✅ **Hidden from searches**: The SearchTab filters `jobs.filter(j => j.status === 'Active')`
✅ **Visible in Admin**: Admin panel shows all projects with status badges
✅ **Reversible**: Can be reactivated by changing status back to 'Active'

---

## 🗑️ Delete Implementation

### What is Deletion?

Deletion is a **hard delete** - the project and ALL associated data are permanently removed from the database.

### Database Implementation

**Action**: Remove the job row, CASCADE deletes all candidates

**SQL Query**:
```sql
DELETE FROM jobs WHERE id = $1;
-- CASCADE automatically executes:
-- DELETE FROM candidates WHERE job_id = $1;
```

**Backend Code** ([backend/server.js:318-332](backend/server.js#L318-L332)):
```javascript
app.delete('/api/jobs/:id', verifyToken, async (req, res) => {
    try {
        // Get job title for audit log (before deletion)
        const jobResult = await pool.query(
            'SELECT title FROM jobs WHERE id = $1',
            [req.params.id]
        );
        const jobTitle = jobResult.rows[0]?.title || 'Unknown';

        // Delete the job (CASCADE automatically deletes candidates)
        await pool.query('DELETE FROM jobs WHERE id = $1', [req.params.id]);

        // Log the deletion
        await logAudit(req.user.email, 'DELETE_JOB', 'job', req.params.id, { title: jobTitle });

        res.json({ success: true });
    } catch(err) {
        console.error('Error deleting job:', err);
        res.status(500).json(err);
    }
});
```

**Frontend Code** ([App.tsx:250-269](App.tsx#L250-L269)):
```typescript
const handleDeleteJob = async (jobId: string) => {
  // Remove all candidates from local state
  const candidatesToDelete = candidates.filter(c => c.jobId === jobId);
  for (const candidate of candidatesToDelete) {
    await api.deleteCandidate(candidate.id); // Individual DELETE calls
  }
  setCandidates(prev => prev.filter(c => c.jobId !== jobId));

  // Delete the job via API
  await fetch(`${backendUrl}/api/jobs/${jobId}`, {
    method: 'DELETE',
    headers: { ... }
  });

  // Remove from local state
  setJobs(prev => prev.filter(j => j.id !== jobId));
};
```

### What Happens When Deleted?

❌ **Job removed**: Job row deleted from `jobs` table
❌ **Candidates removed**: ALL candidates deleted via CASCADE
✅ **Audit log created**: Deletion event logged with job title
⚠️ **IRREVERSIBLE**: Data cannot be recovered (no soft delete)

---

## 🔐 CASCADE Deletion Behavior

### Understanding ON DELETE CASCADE

The `ON DELETE CASCADE` constraint is set on the `candidates.job_id` foreign key:

```sql
job_id VARCHAR(50) REFERENCES jobs(id) ON DELETE CASCADE
```

This means:
1. When you delete a job with `DELETE FROM jobs WHERE id = 'job-123'`
2. PostgreSQL **automatically** executes `DELETE FROM candidates WHERE job_id = 'job-123'`
3. You don't need to manually delete candidates - the database handles it

### Why Use CASCADE?

✅ **Data integrity**: Prevents orphaned candidates (candidates without a job)
✅ **Atomic operations**: Deletion happens in a single transaction
✅ **Simplified code**: No need to manually delete related records
✅ **Performance**: Database-level optimization is faster than app-level loops

### Alternative Approaches (NOT USED)

**Option 1: Manual Deletion** (what frontend does for local state sync)
```javascript
// Delete candidates first
await pool.query('DELETE FROM candidates WHERE job_id = $1', [jobId]);
// Then delete job
await pool.query('DELETE FROM jobs WHERE id = $1', [jobId]);
```
❌ More code, slower, risk of partial deletion if second query fails

**Option 2: Soft Delete**
```sql
ALTER TABLE jobs ADD COLUMN deleted_at TIMESTAMP NULL;
UPDATE jobs SET deleted_at = NOW() WHERE id = $1;
```
❌ Complicates queries (need to filter `WHERE deleted_at IS NULL` everywhere)

---

## 📝 Audit Logging

Both archive and delete operations are logged in the `audit_logs` table:

```sql
CREATE TABLE audit_logs (
    id SERIAL PRIMARY KEY,
    actor_email VARCHAR(255) NOT NULL,
    event_type VARCHAR(100) NOT NULL,     -- 'UPSERT_JOB', 'DELETE_JOB'
    resource_type VARCHAR(50),             -- 'job'
    resource_id VARCHAR(50),               -- job ID
    payload JSONB,                         -- { title: "Senior Developer" }
    created_at TIMESTAMP DEFAULT NOW()
);
```

**Archive Event**:
```json
{
  "event_type": "UPSERT_JOB",
  "payload": { "title": "Senior Developer", "status": "Suspended" }
}
```

**Delete Event**:
```json
{
  "event_type": "DELETE_JOB",
  "payload": { "title": "Senior Developer" }
}
```

You can view audit logs in **Admin → Logs** tab.

---

## 🛡️ Safety Features

### Archive Protection
- User must confirm: "Archive this project? It will be marked as 'Suspended'..."
- Reversible action - can reactivate later

### Delete Protection
- User must confirm with warning based on candidate count
- If candidates exist: "⚠️ WARNING: This will permanently delete [Project] and [N] candidates! This action CANNOT be undone."
- If no candidates: "Delete [Project]? This action cannot be undone."
- Double confirmation prevents accidental deletion

### Frontend Code ([AdminPanel.tsx:468-482](components/AdminPanel.tsx#L468-L482)):
```typescript
const handleDelete = async (jobId: string, jobTitle: string) => {
  const candidateCount = candidates.filter(c => c.jobId === jobId).length;
  const confirmMessage = candidateCount > 0
    ? `⚠️ WARNING: This will permanently delete "${jobTitle}" and ${candidateCount} candidate(s)!\n\nThis action CANNOT be undone. Are you absolutely sure?`
    : `Delete "${jobTitle}"? This action cannot be undone.`;

  if (window.confirm(confirmMessage)) {
    try {
      await onDeleteJob(jobId);
      alert('Project deleted successfully');
    } catch (error) {
      alert('Failed to delete project');
    }
  }
};
```

---

## 🔄 Data Flow Diagrams

### Archive Flow
```
User clicks "Archive"
    ↓
Confirm dialog
    ↓
handleArchiveJob(jobId)
    ↓
Update local state: status = 'Suspended'
    ↓
api.upsertJob(updated)
    ↓
POST /api/jobs { ...job, status: 'Suspended' }
    ↓
UPDATE jobs SET status = 'Suspended' WHERE id = $1
    ↓
Audit log: UPSERT_JOB event
    ↓
Response: { success: true }
    ↓
UI updates: Job status badge changes to "Suspended"
```

### Delete Flow
```
User clicks "Delete"
    ↓
Show warning with candidate count
    ↓
Confirm dialog
    ↓
handleDeleteJob(jobId)
    ↓
Loop: Delete each candidate
    ├─→ api.deleteCandidate(c.id)
    └─→ DELETE /api/candidates/:id
    ↓
Update local state: Remove candidates
    ↓
DELETE /api/jobs/:id
    ↓
Backend: SELECT title FROM jobs (for audit)
    ↓
Backend: DELETE FROM jobs WHERE id = $1
    ├─→ Database CASCADE: DELETE FROM candidates WHERE job_id = $1
    └─→ Audit log: DELETE_JOB event
    ↓
Response: { success: true }
    ↓
Update local state: Remove job
    ↓
UI updates: Project removed from list
```

---

## 🎯 Key Takeaways

1. **Archive = Status Update**: Just changes `status` field to 'Suspended', keeps all data
2. **Delete = Permanent Removal**: Removes job and CASCADE deletes all candidates
3. **CASCADE is Automatic**: Database handles candidate deletion, no manual cleanup needed
4. **Audit Logs Everything**: Both operations logged for compliance and debugging
5. **Safety First**: Confirmation dialogs prevent accidental data loss

---

## 📚 Related Files

- **Frontend**: [components/AdminPanel.tsx](components/AdminPanel.tsx#L456-L607) - Projects tab UI
- **Frontend**: [App.tsx:239-269](App.tsx#L239-L269) - Archive/Delete handlers
- **Backend**: [backend/server.js:318-332](backend/server.js#L318-L332) - DELETE /api/jobs endpoint
- **Schema**: [backend/schema.sql:48-61](backend/schema.sql#L48-L61) - Jobs table with CASCADE

---

**Last Updated**: 2026-01-08
**Feature**: Admin Panel - Project Management (Archive & Delete)
