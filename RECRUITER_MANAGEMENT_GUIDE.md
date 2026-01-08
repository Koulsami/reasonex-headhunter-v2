# Recruiter Management Guide

## Overview

The Admin panel now includes full recruiter/team member management functionality, allowing administrators to add and remove recruiters from the system.

---

## 📍 Where to Find It

**Admin → Security Tab → Recruiter Management Section**

The Security tab now has two sections:
1. **Authorized Users** - Login access control (existing)
2. **Recruiter Management** - Team member CRUD operations (new)

---

## ✅ Adding a Recruiter

### Step-by-Step

1. Navigate to **Admin → Security**
2. Find the **"Add Recruiter"** form (left side)
3. Fill in the required fields:
   - **Name**: Full name (e.g., "John Smith")
   - **Email**: Work email (e.g., "john.smith@company.com")
   - **Role**: Select either "Recruiter" or "Manager"
4. Click **"Add Recruiter"**

### What Happens

✅ **Avatar Created**: System automatically generates initials from name
   - "John Smith" → "JS"
   - "Sarah Lee" → "SL"

✅ **Color Assigned**: Role-based color scheme
   - **Recruiter**: Green, Teal, or Cyan variants
   - **Manager**: Purple or Indigo variants

✅ **Database Entry**: Added to `app_users` table with unique ID

✅ **Login Access**: Automatically added to `authorized_users` table for system access

✅ **Available for Assignment**: Immediately shows up in assignee dropdowns in Kanban board

### Example

**Input**:
- Name: Sarah Johnson
- Email: sarah.johnson@company.com
- Role: Manager

**Result**:
- Avatar: "SJ"
- Color: Purple badge
- Can log in with sarah.johnson@company.com
- Available for candidate/project assignment

---

## 🗑️ Deleting a Recruiter

### Step-by-Step

1. Navigate to **Admin → Security**
2. Find the **"Team Members"** list (middle section)
3. Locate the recruiter you want to remove
4. Click the **"Delete"** button
5. Confirm the deletion in the warning dialog

### Safety Features

⚠️ **Assignment Count Warning**: The system shows how many items will be affected

**Example Warnings**:
- If assigned to items: *"⚠️ WARNING: Sarah Johnson is assigned to 15 candidate(s) and 3 project(s). Deleting will unassign all. Continue?"*
- If no assignments: *"Delete recruiter Sarah Johnson?"*

### What Happens

❌ **User Removed**: Deleted from `app_users` table

❌ **Login Revoked**: Removed from `authorized_users` (cannot log in anymore)

✅ **Assignments Cleared**: All candidates and projects assigned to this user are automatically unassigned

✅ **Data Preserved**: Candidates and projects remain intact, just unassigned

✅ **Audit Logged**: Deletion event recorded in `audit_logs` with user name

### Database Behavior

The system uses `ON DELETE SET NULL` constraints:

```sql
-- When user deleted, these automatically become NULL
candidates.assignee_id REFERENCES app_users(id) ON DELETE SET NULL
jobs.assignee_id REFERENCES app_users(id) ON DELETE SET NULL
```

This means:
1. Database automatically nullifies `assignee_id` in candidates and jobs
2. Frontend also manually unassigns to sync local state
3. No orphaned references or data corruption

---

## 🎨 Avatar and Color System

### Avatar Generation

**Logic**: Extract first letter of each word in name

**Examples**:
- "Sam Koul" → "SK"
- "John Smith Jr." → "JS"
- "Sarah" → "SA" (takes first 2 letters if single word)

### Color Assignment

**Recruiter Colors** (random selection):
- `bg-green-100 text-green-700`
- `bg-teal-100 text-teal-700`
- `bg-cyan-100 text-cyan-700`
- `bg-emerald-100 text-emerald-700`
- `bg-lime-100 text-lime-700`

**Manager Colors** (random selection):
- `bg-purple-100 text-purple-700`
- `bg-indigo-100 text-indigo-700`
- `bg-violet-100 text-violet-700`
- `bg-fuchsia-100 text-fuchsia-700`

**AI Role** (system default):
- `bg-purple-100 text-purple-700`

---

## 🔐 Access Control Integration

### Recruiter vs Authorized User

When you add a recruiter, the system creates **two** database entries:

1. **`app_users` Table** - Team member profile
   - Stores: name, role, avatar, color
   - Used for: Assignment in Kanban board

2. **`authorized_users` Table** - Login access
   - Stores: email, role (defaults to 'user')
   - Used for: Google OAuth authentication

### Login Flow

1. User visits app → Google OAuth login
2. System checks email against `authorized_users` table
3. If found → Generate JWT token → Grant access
4. User sees Kanban board with their assigned candidates/projects

---

## 📊 Team Members Display

The **Team Members** list shows:

```
┌─────────────────────────────────────────────────────┐
│ [SK] Sam Koul                          [Manager]    │
│      12 candidates, 4 projects         [Delete]     │
├─────────────────────────────────────────────────────┤
│ [SJ] Sarah Johnson                     [Recruiter]  │
│      8 candidates, 2 projects          [Delete]     │
└─────────────────────────────────────────────────────┘
```

**Information Shown**:
- Avatar badge with initials
- Full name
- Role badge (color-coded)
- Assignment counts (candidates and projects)
- Delete button

**Note**: AI Recruiter is filtered out (not shown in Team Members list)

---

## 🔄 Database Schema

### app_users Table

```sql
CREATE TABLE app_users (
    id VARCHAR(50) PRIMARY KEY,        -- UUID generated by frontend
    name VARCHAR(255) NOT NULL,        -- Full name
    role VARCHAR(50) NOT NULL,         -- 'Recruiter', 'Manager', 'AI'
    avatar VARCHAR(10),                -- Initials (e.g., 'SK')
    color VARCHAR(50),                 -- Tailwind classes
    created_at TIMESTAMP DEFAULT NOW()
);
```

### authorized_users Table

```sql
CREATE TABLE authorized_users (
    email VARCHAR(255) PRIMARY KEY,    -- Login email
    role VARCHAR(50) DEFAULT 'user',   -- 'admin' or 'user'
    created_at TIMESTAMP DEFAULT NOW(),
    last_login_at TIMESTAMP
);
```

### Relationships

```sql
-- Candidates
CREATE TABLE candidates (
    id VARCHAR(50) PRIMARY KEY,
    job_id VARCHAR(50) REFERENCES jobs(id) ON DELETE CASCADE,
    assignee_id VARCHAR(50) REFERENCES app_users(id) ON DELETE SET NULL,
    ...
);

-- Jobs
CREATE TABLE jobs (
    id VARCHAR(50) PRIMARY KEY,
    client_id VARCHAR(50) REFERENCES clients(id) ON DELETE CASCADE,
    assignee_id VARCHAR(50) REFERENCES app_users(id) ON DELETE SET NULL,
    ...
);
```

---

## 🎯 Use Cases

### Use Case 1: Onboarding New Recruiter

**Scenario**: Hiring a new team member

**Steps**:
1. Add recruiter in Admin → Security
   - Name: John Doe
   - Email: john.doe@company.com
   - Role: Recruiter
2. System generates avatar "JD" with green badge
3. John receives welcome email (manual step)
4. John logs in with Google OAuth using john.doe@company.com
5. John sees Kanban board, can be assigned candidates

### Use Case 2: Removing Former Employee

**Scenario**: Team member leaves company

**Steps**:
1. Go to Admin → Security → Team Members
2. Find "John Doe" (shows: 20 candidates, 5 projects)
3. Click Delete
4. System warns: "⚠️ WARNING: John Doe is assigned to 20 candidates and 5 projects"
5. Confirm deletion
6. All 20 candidates and 5 projects now show "Unassigned"
7. John can no longer log in
8. Manager reassigns candidates to other recruiters

### Use Case 3: Promoting Recruiter to Manager

**Current Limitation**: No edit functionality yet

**Workaround**:
1. Delete recruiter
2. Re-add with "Manager" role
3. Reassign candidates/projects manually

**Future Enhancement**: Add edit button to change role without deletion

---

## 🛡️ Safety Features

### 1. Assignment Count Warning
Shows how many items will be affected before deletion

### 2. Confirmation Dialog
Requires explicit user confirmation to delete

### 3. Automatic Unassignment
Database constraints ensure no orphaned references

### 4. Audit Logging
All add/delete operations logged with:
- Actor email (who performed the action)
- Event type (ADD_USER, DELETE_USER)
- User details (name, role)
- Timestamp

### 5. Data Preservation
Deleting recruiter never deletes candidates or projects, only unassigns them

---

## 📝 Audit Trail

Every recruiter management action is logged in `audit_logs`:

**Add Event**:
```json
{
  "actor_email": "admin@company.com",
  "event_type": "ADD_USER",
  "resource_type": "user",
  "resource_id": "uuid-of-new-user",
  "payload": {
    "name": "Sarah Johnson",
    "role": "Manager"
  },
  "created_at": "2026-01-08T10:30:00Z"
}
```

**Delete Event**:
```json
{
  "actor_email": "admin@company.com",
  "event_type": "DELETE_USER",
  "resource_type": "user",
  "resource_id": "uuid-of-deleted-user",
  "payload": {
    "name": "John Doe"
  },
  "created_at": "2026-01-08T11:45:00Z"
}
```

View logs in **Admin → Logs** tab.

---

## 🔧 API Endpoints

### Add Recruiter

**Endpoint**: `POST /api/users`

**Request Body**:
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "Sarah Johnson",
  "role": "Manager",
  "avatar": "SJ",
  "color": "bg-purple-100 text-purple-700"
}
```

**Response**:
```json
{
  "success": true
}
```

### Delete Recruiter

**Endpoint**: `DELETE /api/users/:id`

**Response**:
```json
{
  "success": true
}
```

---

## 🚀 Testing Checklist

- [ ] Add recruiter with single-word name (e.g., "Sarah")
- [ ] Add recruiter with multi-word name (e.g., "John Smith Jr.")
- [ ] Verify avatar initials generated correctly
- [ ] Verify role-based color assignment
- [ ] Check recruiter appears in assignee dropdowns
- [ ] Assign candidates/projects to new recruiter
- [ ] Delete recruiter with assignments
- [ ] Verify warning shows correct counts
- [ ] Confirm assignments cleared after deletion
- [ ] Verify deleted user cannot log in
- [ ] Check audit logs recorded events

---

## 📚 Related Files

- **Frontend**: [components/AdminPanel.tsx:191-390](components/AdminPanel.tsx#L191-L390) - Recruiter management UI
- **Frontend**: [App.tsx:321-392](App.tsx#L321-L392) - Add/Delete handlers
- **Backend**: [backend/server.js:334-366](backend/server.js#L334-L366) - User CRUD endpoints
- **Schema**: [backend/schema.sql:28-36](backend/schema.sql#L28-L36) - app_users table

---

**Last Updated**: 2026-01-08
**Feature**: Admin Panel - Recruiter Management
**Status**: Production Ready ✅
