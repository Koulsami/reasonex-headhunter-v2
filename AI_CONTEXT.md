
# Project Context for AI Assistants (Claude/Copilot)

## Project Overview
**Name:** Reasonex HeadHunter V2
**Type:** Recruitment Dashboard (ATS - Applicant Tracking System)
**Goal:** Manage candidates, clients, and jobs with AI-powered insights (Gemini) and market intelligence.

## Tech Stack
- **Frontend:** React 18, Vite, TypeScript, Tailwind CSS.
- **Backend:** Node.js, Express, PostgreSQL (node-postgres).
- **AI:** Google Gemini API (`@google/genai` SDK).
- **Auth:** Google OAuth (Frontend `react-oauth/google`, Backend `google-auth-library`).

## Architecture & Data Flow

### 1. Hybrid Data Mode (`services/apiService.ts`)
The application runs in two modes based on environment and auth status:
- **Mock Mode (Default/Offline):** If no backend is detected or no user is logged in, it uses a synchronous in-memory mock database (`MOCK_DB`). This allows UI development without a database connection.
- **Production Mode:** If `REACT_APP_BACKEND_URL` is set and a user token exists, it makes real HTTP requests to the Node.js / PostgreSQL backend.

### 2. AI Integration (`services/geminiService.ts`)
- Uses **Gemini 1.5 Flash** for fast text analysis (Job Descriptions).
- Uses **Gemini 1.5 Pro** for complex reasoning (Candidate Matching).
- **Strict Rule:** API Key is accessed via `process.env.API_KEY` only.
- **Features:**
    - `analyzeJobDescription`: Extracts keywords and boolean strings from raw text.
    - `searchLinkedInCandidates`: Mocked integration (intended for N8N webhooks).
    - `performCandidateSearch`: Matches JD keywords against mock/real databases.

### 3. Key Components
- **App.tsx**: Main layout and state container. Handles strict routing via conditional rendering of Tabs.
- **SearchTab.tsx**: Input for Job Descriptions, interacts with Gemini to generate candidate lists.
- **KanbanTab.tsx**: Drag-and-drop style board for candidate stages (Identified -> Hired).
- **IntelligenceTab.tsx**: RSS/News aggregator for market research.
- **AdminPanel.tsx**: System configuration and user whitelist management.

## Project Structure
- `/services`: Contains business logic and API calls. Separated to allow swapping mock/real implementations.
- `/components`: Presentational React components.
- `/backend`: Standalone Node.js server (express).

## Development Guidelines
1. **Types:** Always define interfaces in `types.ts`.
2. **Styling:** Use Tailwind utility classes. Do not use external CSS files.
3. **Icons:** Use SVG strings or `lucide-react`.
4. **Environment:** accessing `process.env` in Vite requires `import.meta.env` usually, but this project uses a `define` plugin in `vite.config.ts` to allow `process.env` syntax for compatibility.
