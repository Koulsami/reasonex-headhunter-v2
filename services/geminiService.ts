
import { GoogleGenerativeAI } from "@google/generative-ai";
import { SearchResult, NewsItem, CandidateSearchResponse, RawSearchResult, Candidate } from "../types";

/**
 * GEMINI API CLIENT INITIALIZATION
 *
 * Vite uses import.meta.env for environment variables.
 * Priority: 1) VITE_API_KEY (Vite standard), 2) API_KEY (fallback)
 *
 * NOTE: We use a fallback string during initialization to prevent the entire
 * application from crashing with a White Screen if the API key is missing locally.
 * Actual calls are guarded within the functions.
 */
const getApiKey = () => {
  if (import.meta.env.VITE_API_KEY) {
    return import.meta.env.VITE_API_KEY;
  }
  if (typeof process !== 'undefined' && process.env?.API_KEY) {
    return process.env.API_KEY;
  }
  return "missing-key-fallback";
};

const apiKey = getApiKey();
const ai = new GoogleGenerativeAI(apiKey);

// Default Configuration for External Integrations (N8N / Webhooks)
let INTEGRATION_CONFIG = {
    linkedinApiUrl: 'https://n8n-production-3f14.up.railway.app/webhook-test/275acb0f-4966-4205-83c8-5fc86b0e7fb1',
    jobAlertsApiUrl: 'https://n8n-production-3f14.up.railway.app/webhook/bc4a44fa-2a16-4108-acb1-34c2353e9476'
};

export const setIntegrationConfig = (config: { linkedinApiUrl?: string, jobAlertsApiUrl?: string }) => {
    if (config.linkedinApiUrl) INTEGRATION_CONFIG.linkedinApiUrl = config.linkedinApiUrl;
    if (config.jobAlertsApiUrl) INTEGRATION_CONFIG.jobAlertsApiUrl = config.jobAlertsApiUrl;
};

// --- MOCK DATA GENERATOR ---
// Used to demonstrate UI functionality when AI/API limits are hit or keys are missing.
const getMockCandidates = (source: 'LinkedIn' | 'Internal' | 'Google'): Partial<Candidate>[] => ([
    {
        name: "Sarah Jenkins",
        role: "Senior Product Manager",
        company: "TechFlow Systems",
        matchScore: 94,
        email: "sarah.j@techflow.mock",
        linkedinUrl: "https://linkedin.com",
        source: source,
        fitLevel: "Strong",
        strengths: "Product Strategy | Agile Leadership | UX Focus",
        concerns: "High salary expectation",
        summary: "Experienced PM with 8 years in SaaS. (Simulated Data)"
    },
    {
        name: "David Chen",
        role: "Lead Developer",
        company: "CloudScale Inc",
        matchScore: 88,
        email: "david.c@cloudscale.mock",
        linkedinUrl: "https://linkedin.com",
        source: source,
        fitLevel: "Good",
        strengths: "Python | AWS | System Design",
        summary: "Technical lead specializing in backend scalability. (Simulated Data)"
    }
]);

/**
 * Analyzes a Job Description (JD) using Gemini 1.5 Flash.
 * Extracts:
 * 1. A boolean search string for LinkedIn/Google.
 * 2. Key technical keywords.
 * 
 * @param jd - The full text of the job description.
 * @returns SearchResult object containing boolean string and keywords.
 */
export const analyzeJobDescription = async (jd: string): Promise<SearchResult> => {
  if (!getApiKey() || getApiKey() === "missing-key-fallback") {
      console.warn("Missing API_KEY, using default search parameters.");
      return {
        booleanString: 'site:linkedin.com/in (software OR engineer) AND "react"',
        keywords: ["React", "TypeScript", "Frontend"]
      };
  }
  try {
    const model = ai.getGenerativeModel({ model: "gemini-1.5-flash" });
    const prompt = `Analyze this job description and extract a boolean search string for LinkedIn/Google and a list of keywords. Return as JSON with format: {"booleanString": "...", "keywords": ["..."]}. Job Description: ${jd}`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // Try to parse JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]) as SearchResult;
    }

    throw new Error("No valid JSON in response");
  } catch (error) {
    console.error("Gemini Analysis Failed:", error);
    return {
        booleanString: 'site:linkedin.com/in (software OR engineer) AND "react"',
        keywords: ["React", "TypeScript", "Frontend"]
    };
  }
};

/**
 * Sends search parameters to an external integration (e.g. N8N webhook)
 * that performs the actual LinkedIn scraping/searching.
 */
export const searchLinkedInCandidates = async (
  jobContext: string,
  country: string,
  numCandidatesAnalyze: number,
  numCandidatesOutput: number
): Promise<CandidateSearchResponse> => {
  try {
    const apiUrl = INTEGRATION_CONFIG.linkedinApiUrl;
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        job_context: jobContext,
        country: country,
        num_candidates_analyze: numCandidatesAnalyze,
        num_candidates_output: numCandidatesOutput,
        search_mode: "wide"
      })
    });

    if (!response.ok) throw new Error("API Failed");
    const data = await response.json();

    // Handle both array response [{ results: [...] }] and direct object { results: [...] }
    const resultsData = Array.isArray(data) ? data[0] : data;
    const rawResults = resultsData.results || [];

    // Transform API response to match Candidate interface
    const candidates = rawResults.map((item: any) => ({
        name: `${item.candidate_First_Name || ''} ${item.candidate_Last_Name || ''}`.trim() || 'Unknown',
        role: item.likely_seniority || 'Unknown',
        company: 'External', // LinkedIn doesn't provide current company in this format
        matchScore: item.score || 0,
        email: '', // LinkedIn doesn't provide email
        linkedinUrl: item.linkedin_url || '',
        source: 'LinkedIn' as const,
        fitLevel: item.fit_level || 'maybe',
        strengths: item.strengths || '',
        concerns: item.concerns || '',
        summary: item.Description || item.recommended_next_step || '',
        imageUrl: item.profile_image_url || ''
    }));

    return {
        rawResponse: JSON.stringify(data),
        rawResults: rawResults,
        candidates: candidates
    };

  } catch (error) {
    console.warn("Returning MOCK LINKEDIN RESULTS (API Failure)", error);
    return {
        rawResponse: JSON.stringify({ error: "API Failed, showing mock data" }),
        rawResults: [],
        candidates: getMockCandidates('LinkedIn')
    };
  }
};

/**
 * Placeholder for future direct Google Search integration via Gemini Tools.
 */
export const performCandidateSearch = async (query: string): Promise<CandidateSearchResponse> => {
  if (!getApiKey() || getApiKey() === "missing-key-fallback") {
      return {
          rawResponse: "Mock Data",
          rawResults: [],
          candidates: getMockCandidates('Google')
      };
  }
  try {
     // TODO: Implement Gemini Tools with Google Search Grounding here.
     throw new Error("Not implemented in demo");
  } catch (error) {
    return { 
        rawResponse: "Mock Data", 
        rawResults: [], 
        candidates: getMockCandidates('Google') 
    };
  }
};

/**
 * Simulates searching an internal PostgreSQL database using semantic search (future implementation).
 * Currently returns mock data.
 */
export const searchInternalCandidates = async (jd: string): Promise<CandidateSearchResponse> => {
    // Always return mock for internal DB simulation in this demo version
    return {
        rawResponse: "{}", 
        rawResults: [],
        candidates: [
            {
                name: "Morgan Smith (Internal)",
                role: "Project Lead",
                company: "Internal Pool",
                matchScore: 85,
                source: "Internal" as const,
                summary: "Fallback internal candidate due to AI error."
            },
            ...getMockCandidates('Internal')
        ]
    };
};

// --- MARKET INTELLIGENCE ---

export const fetchJobAlerts = async (): Promise<NewsItem[]> => {
    try {
        const apiUrl = INTEGRATION_CONFIG.jobAlertsApiUrl;
        if (!apiUrl) {
            console.warn("Job Alerts API URL not configured, returning mock data");
            return [
                { title: "Senior React Developer", source: "TechCorp", url: "#", snippet: "Remote • $140k+", date: "1h ago" },
                { title: "Engineering Manager", source: "StartupInc", url: "#", snippet: "Hybrid • Equity", date: "3h ago" }
            ];
        }

        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({})
        });

        if (!response.ok) throw new Error("Job Alerts API Failed");

        const data = await response.json();
        return data.alerts || data.results || [];

    } catch (error) {
        console.warn("Returning MOCK JOB ALERTS (API Failure)", error);
        return [
            { title: "Senior React Developer", source: "TechCorp", url: "#", snippet: "Remote • $140k+", date: "1h ago" },
            { title: "Engineering Manager", source: "StartupInc", url: "#", snippet: "Hybrid • Equity", date: "3h ago" }
        ];
    }
};

export const getClientNews = async (clientName: string): Promise<{ news: NewsItem[] }> => {
    // This could be implemented with a news API webhook if configured
    // For now, returns mock data for demonstration
    return {
        news: [
            {
                title: `${clientName} announces Q4 results`,
                source: "Business Wire",
                url: "#",
                snippet: "Financial performance exceeds expectations...",
                date: "2 days ago"
            },
            {
                title: `${clientName} expands into new markets`,
                source: "Reuters",
                url: "#",
                snippet: "Strategic expansion initiative announced...",
                date: "1 week ago"
            }
        ]
    };
};

export const getIndustryNews = async (sourceName: string, url: string): Promise<{ news: NewsItem[], alerts: NewsItem[] }> => {
    // RSS feed parsing requires backend due to CORS
    // Returns mock data for demonstration
    return {
        news: [
            {
                title: "Latest trends in HR technology",
                source: sourceName,
                url: url,
                snippet: "How AI is transforming recruitment processes...",
                date: "1 day ago"
            },
            {
                title: "Salary benchmarks for tech roles",
                source: sourceName,
                url: url,
                snippet: "2024 compensation analysis for software engineers...",
                date: "3 days ago"
            },
            {
                title: "Remote work policy updates",
                source: sourceName,
                url: url,
                snippet: "Major companies adjusting hybrid work policies...",
                date: "5 days ago"
            }
        ],
        alerts: [
            {
                title: "Breaking: Tech layoffs announced",
                source: sourceName,
                url: url,
                snippet: "Major tech company reduces workforce...",
                date: "2 hours ago"
            }
        ]
    };
};

export const fetchBlogPosts = async (sourceName: string, url: string): Promise<NewsItem[]> => {
    // Blog RSS parsing requires backend due to CORS
    // Returns mock data for demonstration
    return [
        {
            title: "5 tips for effective candidate sourcing",
            source: sourceName,
            url: url,
            snippet: "Proven strategies to find top talent in competitive markets...",
            date: "1 day ago"
        },
        {
            title: "The future of recruitment automation",
            source: sourceName,
            url: url,
            snippet: "How AI tools are changing the hiring landscape...",
            date: "3 days ago"
        },
        {
            title: "Building diverse hiring pipelines",
            source: sourceName,
            url: url,
            snippet: "Best practices for inclusive recruitment strategies...",
            date: "1 week ago"
        }
    ];
};
