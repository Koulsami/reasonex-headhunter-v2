# Job Alerts Troubleshooting Guide

## Issue Summary

The Intelligence Tab's **Job Alerts** column is showing mock data instead of real data from the N8N webhook.

---

## Root Cause Analysis

### Test Results

Running the test script revealed the issue:

```bash
node backend/test-job-alerts.js
```

**Response from N8N Webhook**:
```json
{
  "code": 0,
  "message": "No item to return was found"
}
```

**Status Code**: `500 Internal Server Error`

### What This Means

1. ✅ The backend API endpoint `/api/job-alerts` is correctly implemented
2. ✅ The webhook URL is correctly configured in the database
3. ✅ The backend can reach the N8N server
4. ❌ **The N8N workflow itself is returning an error** - "No item to return was found"
5. ❌ This causes the frontend to fall back to mock data in the catch block

---

## System Architecture

```
Frontend (IntelligenceTab.tsx)
    ↓
fetchJobAlerts() in geminiService.ts
    ↓
POST /api/job-alerts (Backend Proxy)
    ↓
N8N Webhook: https://n8n-production-3f14.up.railway.app/webhook/bc4a44fa-2a16-4108-acb1-34c2353e9476
    ↓
Expected Response: { alerts: [...] } or { results: [...] }
    ↓
Actual Response: { "code": 0, "message": "No item to return was found" } ❌
```

---

## Expected N8N Workflow Behavior

The N8N webhook should:

### 1. Accept POST Request

```json
POST https://n8n-production-3f14.up.railway.app/webhook/bc4a44fa-2a16-4108-acb1-34c2353e9476
Content-Type: application/json

{}
```

### 2. Return Job Alerts Data

**Format Option 1** (Preferred):
```json
{
  "alerts": [
    {
      "title": "Senior Full Stack Developer",
      "source": "Google Jobs",
      "url": "https://jobs.example.com/...",
      "snippet": "Remote • $160k-$200k • React, Node.js",
      "date": "2h ago"
    },
    {
      "title": "DevOps Engineer",
      "source": "LinkedIn",
      "url": "https://linkedin.com/jobs/...",
      "snippet": "Hybrid Seattle • $140k+ • K8s, AWS",
      "date": "4h ago"
    }
  ]
}
```

**Format Option 2** (Also Supported):
```json
{
  "results": [
    {
      "title": "...",
      "source": "...",
      "url": "...",
      "snippet": "...",
      "date": "..."
    }
  ]
}
```

### 3. HTTP Status

- **Success**: Return `200 OK` with data
- **No Data Available**: Return `200 OK` with empty array: `{ "alerts": [] }`
- **Avoid**: Returning 500 error when there's no data

---

## Current Code Flow

### Frontend: geminiService.ts

```typescript
export const fetchJobAlerts = async (): Promise<NewsItem[]> => {
    try {
        const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';
        const apiUrl = `${backendUrl}/api/job-alerts`;
        const token = localStorage.getItem('authToken') || 'DEV_TOKEN_REASONEX';

        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({})
        });

        if (!response.ok) {
            throw new Error(`Job Alerts API Failed: ${response.status}`);
        }

        const data = await response.json();
        return data.alerts || data.results || [];

    } catch (error) {
        console.warn("Returning MOCK JOB ALERTS (API Failure)", error);
        // ⚠️ Falls back to mock data when N8N fails
        return generateMockAlerts();
    }
};
```

### Backend: server.js

```javascript
app.post('/api/job-alerts', verifyToken, async (req, res) => {
    try {
        const jobAlertsApiUrl = 'https://n8n-production-3f14.up.railway.app/webhook/bc4a44fa-2a16-4108-acb1-34c2353e9476';

        const response = await fetch(jobAlertsApiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(req.body)
        });

        const data = await response.json();

        // ✅ NEW: Check if N8N returned an error
        if (!response.ok || data.code === 0 || data.message === 'No item to return was found') {
            throw new Error(`N8N Webhook Error: ${data.message}`);
        }

        res.json(data);
    } catch(err) {
        res.status(500).json({
            error: err.message,
            details: 'Job Alerts API failed'
        });
    }
});
```

---

## How to Fix the N8N Workflow

### Option 1: Configure N8N to Fetch Real Job Data

The N8N workflow should be configured to:

1. **Scrape Job Boards**:
   - Use HTTP Request nodes to fetch from Indeed, LinkedIn Jobs API, or other sources
   - Parse job listings from RSS feeds or APIs

2. **Transform Data**:
   - Use Function or Set nodes to transform scraped data into the expected format
   - Ensure each item has: `title`, `source`, `url`, `snippet`, `date`

3. **Return Results**:
   - Use a "Respond to Webhook" node
   - Return JSON with structure: `{ "alerts": [...] }`

### Option 2: Return Empty Array When No Data

If the workflow has no data to return, it should return:

```json
{
  "alerts": []
}
```

With HTTP status `200 OK`, **not** `500 Internal Server Error`.

### Option 3: Use Mock Data in N8N

Configure the workflow to return sample data for testing:

**N8N Function Node**:
```javascript
const mockAlerts = [
  {
    title: "Senior Full Stack Developer",
    source: "Google Jobs",
    url: "https://jobs.google.com/example",
    snippet: "Remote • $160k-$200k • React, Node.js",
    date: "2h ago"
  },
  {
    title: "DevOps Engineer",
    source: "LinkedIn",
    url: "https://linkedin.com/jobs/example",
    snippet: "Hybrid Seattle • $140k+ • K8s, AWS",
    date: "4h ago"
  }
];

return { alerts: mockAlerts };
```

---

## Testing the Fix

### 1. Test N8N Webhook Directly

```bash
curl -X POST https://n8n-production-3f14.up.railway.app/webhook/bc4a44fa-2a16-4108-acb1-34c2353e9476 \
  -H "Content-Type: application/json" \
  -d '{}'
```

**Expected Response**:
```json
{
  "alerts": [
    { "title": "...", "source": "...", "url": "...", "snippet": "...", "date": "..." }
  ]
}
```

### 2. Test Backend Endpoint

```bash
node backend/test-job-alerts.js
```

**Expected Output**:
```
✓ API is accessible
✓ Data format looks correct
  - alerts: 8
```

### 3. Test Frontend

1. Open the app in browser
2. Navigate to **Intelligence** tab
3. Check the **Job Alerts** column
4. Should see real data instead of mock data
5. Click refresh button to reload alerts

---

## Debugging Steps

### Check Backend Logs

When you refresh the Job Alerts column:

```bash
# Railway logs
railway logs --service backend

# Look for these log lines:
=== JOB ALERTS REQUEST START ===
Calling Job Alerts API: https://n8n-production-3f14.up.railway.app/webhook/...
Job Alerts API Response status: 500
Job Alerts API raw response: {"code":0,"message":"No item to return was found"}
N8N Workflow Issue: The webhook is not configured correctly or has no data
=== JOB ALERTS REQUEST FAILED ===
```

### Check Frontend Console

```javascript
// Browser DevTools Console
[Frontend] Calling backend Job Alerts API: https://...railway.app/api/job-alerts
[Frontend] Job Alerts response status: 500
[Frontend] Job Alerts error: { error: "N8N Webhook Error: No item to return was found" }
Returning MOCK JOB ALERTS (API Failure)
```

### Check N8N Workflow

1. Go to [N8N Dashboard](https://n8n-production-3f14.up.railway.app)
2. Find the "Job Alerts" workflow
3. Check the "Webhook" node configuration
4. Check the data transformation nodes
5. Test the workflow manually

---

## Workarounds (Temporary)

### Option A: Use Mock Data (Current Behavior)

The system already falls back to mock data, so users can see the UI working.

**No action needed** - mock data is generated in `geminiService.ts:259-290`.

### Option B: Disable Job Alerts Column

If you don't want to show mock data, you can hide the column:

**Edit `components/IntelligenceTab.tsx`**:

```typescript
// Comment out the Job Alerts column (lines 256-285)
{/* 3. Job Alerts Column (External API) */}
{/* <div className="flex flex-col bg-white rounded-xl border border-red-100 overflow-hidden h-full">
  ...
</div> */}
```

### Option C: Update Mock Data to Match Real Sources

Update the mock data in `geminiService.ts` to reflect actual job sources:

```typescript
const generateMockAlerts = () => {
    const jobs = [
        { title: "Senior Developer - Node.js", company: "LinkedIn Jobs", snippet: "Remote • Singapore • $120k-$150k", hours: 2 },
        { title: "Full Stack Engineer", company: "Indeed", snippet: "Remote • USA • React, TypeScript", hours: 5 },
        // ... customize to match your region/industry
    ];
    // ...
};
```

---

## Long-term Solution

### Recommendation

**Configure the N8N workflow properly** to fetch real job alerts from:

1. **LinkedIn Jobs API** (if available)
2. **Indeed RSS Feed**: `https://www.indeed.com/rss?q=software+engineer`
3. **Google Jobs Search API**
4. **Custom scrapers** using Puppeteer/Playwright in N8N

### Example N8N Workflow Structure

```
1. [Schedule Trigger] (runs every 4 hours)
    ↓
2. [HTTP Request] → Fetch Indeed RSS Feed
    ↓
3. [XML Parser] → Parse RSS XML to JSON
    ↓
4. [Function] → Transform to alerts format
    ↓
5. [Postgres] → Store in cache table
    ↓
6. [Webhook] → Return cached alerts when called
    ↓
7. [Respond to Webhook] → { "alerts": [...] }
```

---

## Summary

| Component | Status | Issue |
|-----------|--------|-------|
| Frontend (`IntelligenceTab.tsx`) | ✅ Working | Correctly calls API and falls back to mock |
| Frontend (`geminiService.ts`) | ✅ Working | Correct API call, proper error handling |
| Backend (`/api/job-alerts`) | ✅ Working | Correctly proxies to N8N, improved error detection |
| Database (`system_config`) | ✅ Configured | Correct webhook URL stored |
| **N8N Webhook** | ❌ **ERROR** | **Returns 500 with "No item to return was found"** |

### Action Required

**Fix the N8N workflow** at:
`https://n8n-production-3f14.up.railway.app/webhook/bc4a44fa-2a16-4108-acb1-34c2353e9476`

To return job alerts data in the format:
```json
{
  "alerts": [
    { "title": "...", "source": "...", "url": "...", "snippet": "...", "date": "..." }
  ]
}
```

---

**Last Updated**: 2026-01-08
**Issue**: Job Alerts showing mock data
**Root Cause**: N8N webhook not configured (returns error)
**Status**: Awaiting N8N workflow fix
