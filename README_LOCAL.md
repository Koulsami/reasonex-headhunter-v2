
# How to Run Reasonex HeadHunter Locally

Since you developed this application in a Cloud Environment (AI Studio/Project IDX), here is how you can run it on your own laptop.

## 1. Get the Code to Your Laptop

The easiest way is to use **Git**:

1.  **In the Cloud Environment (Here):**
    *   Run the repair script to fix git issues: `node git_reset.js`
    *   Create a new repository on GitHub.
    *   Link it: `git remote add origin <your-github-url>`
    *   Push: `git push -u origin main --force`

2.  **On Your Laptop:**
    *   Open your terminal/command prompt.
    *   Clone the repo: `git clone <your-github-url>`
    *   Enter the folder: `cd reasonex-headhunter-v2`

## 2. Prerequisites

Ensure you have **Node.js** installed on your laptop.
*   Download: [https://nodejs.org/](https://nodejs.org/)
*   Check version: `node -v` (Should be v18 or higher)

## 3. Running the Frontend (The Dashboard)

This is the main interface (React/Vite).

1.  Open a terminal in the project root.
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Start the development server:
    ```bash
    npm run dev
    ```
4.  Open your browser to `http://localhost:3000` (or the port shown in the terminal).

*Note: The app has a "Simulation Mode" button on the loading screen. You can use this to test the UI without running the backend.*

## 4. Running the Backend (Optional)

If you want the full database features (PostgreSQL) and API:

1.  **Database:** You need a PostgreSQL database running locally or in the cloud (like Railway/Supabase).
2.  **Environment Variables:** Create a `.env` file in the `backend/` folder with:
    ```
    DATABASE_URL=postgresql://user:password@localhost:5432/your_db
    GOOGLE_CLIENT_ID=your_google_client_id
    ```
3.  **Start Server:**
    *   Open a *new* terminal window.
    *   Go to backend: `cd backend`
    *   Install backend deps: `npm install`
    *   Start server: `npm start` (Runs on port 3001)

## 5. Environment Variables (Frontend)

To use real AI features locally, create a `.env` file in the **root** directory:

```env
API_KEY=your_gemini_api_key
```
