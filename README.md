
# Reasonex HeadHunter V2

A comprehensive recruitment dashboard featuring AI-powered JD analysis, candidate tracking, and real-time market intelligence.

## 🛠 Setup for VS Code

This project is optimized for VS Code.

1.  **Open Folder**: Open `reasonex-headhunter-v2` in VS Code.
2.  **Install Extensions**: You should see a prompt to install recommended extensions (ESLint, Prettier, Tailwind). If not, check `.vscode/extensions.json`.
3.  **Install Dependencies**:
    Open the terminal (`Ctrl + ` ` `) and run:
    ```bash
    npm install
    cd backend
    npm install
    cd ..
    ```

## 🚀 How to Run

### 1. Frontend Only (Dashboard & Mock Data)
If you just want to work on the UI, you only need the frontend. It will use Mock Data if the backend isn't running.

```bash
npm run dev
```
*Opens at http://localhost:3000*

### 2. Full Stack (Frontend + Backend + DB)
To persist data, you need the backend running.

1.  **Configure Backend**:
    Create `backend/.env` with:
    ```
    DATABASE_URL=postgresql://postgres:password@localhost:5432/reasonex
    GOOGLE_CLIENT_ID=your_google_client_id
    PORT=3001
    ```
2.  **Start Backend**:
    Inside VS Code, go to the **Run & Debug** tab and click "Launch Backend".
    *Or run manually:* `cd backend && node server.js`

## 🤖 Using with Claude AI

A file named `AI_CONTEXT.md` is included in the root. 
If you are using Claude Projects or Chat, upload this file first. It gives the AI a complete map of the project architecture so it can answer questions accurately without hallucinating files.

## 🔑 Environment Variables

To enable real AI features (Gemini), create a `.env` file in the root:

```env
API_KEY=your_gemini_api_key
REACT_APP_BACKEND_URL=http://localhost:3001
```
