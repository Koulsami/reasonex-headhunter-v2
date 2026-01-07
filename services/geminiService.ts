
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
    linkedinApiUrl: 'https://n8n-production-3f14.up.railway.app/webhook-test/020ab1c4-1d07-4715-8262-d97193c421b5',
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
    // Use backend proxy to avoid CORS issues
    const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';
    const apiUrl = `${backendUrl}/api/linkedin-search`;

    // Get auth token from localStorage (set during login)
    const token = localStorage.getItem('authToken') || 'DEV_TOKEN_REASONEX';

    console.log('[Frontend] Calling backend LinkedIn search API:', apiUrl);

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        job_context: jobContext,
        country: country,
        num_candidates_analyze: numCandidatesAnalyze,
        num_candidates_output: numCandidatesOutput
      })
    });

    console.log('[Frontend] Backend response status:', response.status);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      console.error('[Frontend] Backend error response:', errorData);
      throw new Error(`API Failed: ${errorData.error || response.statusText} (${errorData.errorType || 'Unknown'})`);
    }

    const data = await response.json();
    console.log('[Frontend] Backend response received successfully');

    // Handle both array response [{ results: [...] }] and direct object { results: [...] }
    const resultsData = Array.isArray(data) ? data[0] : data;
    const rawResults = resultsData.results || [];

    // Transform API response to match Candidate interface
    const candidates = rawResults.map((item: any) => {
        const firstName = item.candidate_First_Name || '';
        const lastName = item.candidate_Last_Name || '';
        const fullName = `${firstName} ${lastName}`.trim() || 'Unknown';

        // Score is 0-10, convert to 0-100 for display
        const matchScore = item.score ? item.score * 10 : 0;

        console.log('Transforming candidate:', {
            firstName,
            lastName,
            fullName,
            originalScore: item.score,
            matchScore,
            linkedinUrl: item.linkedin_url
        });

        return {
            name: fullName,
            role: item.likely_seniority || 'Unknown',
            company: 'External', // LinkedIn doesn't provide current company in this format
            matchScore: matchScore,
            email: '', // LinkedIn doesn't provide email
            linkedinUrl: item.linkedin_url || '',
            source: 'LinkedIn' as const,
            fitLevel: item.fit_level || 'maybe',
            strengths: item.strengths || '',
            concerns: item.concerns || '',
            summary: item.Description || item.recommended_next_step || '',
            imageUrl: item.profile_image_url || ''
        };
    });

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
    // Generate dynamic mock data with current timestamps
    const generateMockAlerts = () => {
        const jobs = [
            { title: "Senior Full Stack Developer", company: "Google", snippet: "Remote • $160k-$200k • React, Node.js", hours: 2 },
            { title: "DevOps Engineer", company: "Microsoft", snippet: "Hybrid Seattle • $140k+ • K8s, AWS", hours: 4 },
            { title: "Product Manager", company: "Meta", snippet: "Menlo Park • $180k • 5+ years exp", hours: 6 },
            { title: "Data Scientist", company: "Netflix", snippet: "Remote • $150k-$190k • ML, Python", hours: 8 },
            { title: "Engineering Manager", company: "Stripe", snippet: "SF/Remote • Equity • Lead 10+ engineers", hours: 12 },
            { title: "Senior Backend Engineer", company: "Airbnb", snippet: "Remote • $145k+ • Java, Microservices", hours: 18 },
            { title: "Frontend Lead", company: "Uber", snippet: "NYC • $155k • React, TypeScript", hours: 24 },
            { title: "Solutions Architect", company: "AWS", snippet: "Remote • $170k+ • Cloud, Consulting", hours: 30 },
        ];

        const now = new Date();
        return jobs.map(job => {
            const postTime = new Date(now.getTime() - (job.hours * 60 * 60 * 1000));
            let timeAgo = '';
            if (job.hours < 24) {
                timeAgo = `${job.hours}h ago`;
            } else {
                const days = Math.floor(job.hours / 24);
                timeAgo = `${days}d ago`;
            }

            return {
                title: job.title,
                source: job.company,
                url: `https://linkedin.com/jobs/${job.title.toLowerCase().replace(/\s+/g, '-')}`,
                snippet: job.snippet,
                date: timeAgo
            };
        });
    };

    try {
        // Use backend proxy to avoid CORS issues
        const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';
        const apiUrl = `${backendUrl}/api/job-alerts`;

        // Get auth token from localStorage
        const token = localStorage.getItem('authToken') || 'DEV_TOKEN_REASONEX';

        console.log('[Frontend] Calling backend Job Alerts API:', apiUrl);

        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({})
        });

        console.log('[Frontend] Job Alerts response status:', response.status);

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
            console.error('[Frontend] Job Alerts error:', errorData);
            throw new Error(`Job Alerts API Failed: ${errorData.error || response.statusText}`);
        }

        const data = await response.json();
        console.log('[Frontend] Job Alerts data received successfully');

        return data.alerts || data.results || [];

    } catch (error) {
        console.warn("Returning MOCK JOB ALERTS (API Failure)", error);
        return generateMockAlerts();
    }
};

export const getClientNews = async (clientName: string): Promise<{ news: NewsItem[] }> => {
    const generateMockNews = () => ({
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
    });

    try {
        // Use backend proxy to fetch Google News RSS
        const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';
        const apiUrl = `${backendUrl}/api/news`;
        const token = localStorage.getItem('authToken') || 'DEV_TOKEN_REASONEX';

        console.log('[Frontend] Fetching news for:', clientName);

        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ clientName })
        });

        if (!response.ok) throw new Error('News API Failed');

        const xmlText = await response.text();
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
        const items = xmlDoc.querySelectorAll('item');

        const news: NewsItem[] = Array.from(items).slice(0, 5).map(item => {
            const title = item.querySelector('title')?.textContent || 'No title';
            const link = item.querySelector('link')?.textContent || '#';
            const description = item.querySelector('description')?.textContent || '';
            const pubDate = item.querySelector('pubDate')?.textContent || '';
            const source = item.querySelector('source')?.textContent || 'Google News';

            return {
                title,
                source,
                url: link,
                snippet: description.substring(0, 100) + '...',
                date: pubDate ? new Date(pubDate).toLocaleDateString() : 'Recent'
            };
        });

        return { news };
    } catch (error) {
        console.warn("Returning MOCK CLIENT NEWS (API Failure)", error);
        return generateMockNews();
    }
};

export const getIndustryNews = async (sourceName: string, url: string): Promise<{ news: NewsItem[], alerts: NewsItem[] }> => {
    const generateMockData = () => ({
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
    });

    try {
        // Use backend proxy to fetch RSS feed
        const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';
        const apiUrl = `${backendUrl}/api/rss-feed`;
        const token = localStorage.getItem('authToken') || 'DEV_TOKEN_REASONEX';

        console.log('[Frontend] Fetching RSS feed:', url);

        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ url })
        });

        if (!response.ok) throw new Error('RSS Feed API Failed');

        const xmlText = await response.text();
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
        const items = xmlDoc.querySelectorAll('item');

        const news: NewsItem[] = Array.from(items).slice(0, 10).map(item => {
            const title = item.querySelector('title')?.textContent || 'No title';
            const link = item.querySelector('link')?.textContent || url;
            const description = item.querySelector('description')?.textContent || '';
            const pubDate = item.querySelector('pubDate')?.textContent || '';

            return {
                title,
                source: sourceName,
                url: link,
                snippet: description.substring(0, 150) + '...',
                date: pubDate ? new Date(pubDate).toLocaleDateString() : 'Recent'
            };
        });

        // Split into news (older) and alerts (recent)
        const alerts = news.slice(0, 2);
        const regularNews = news.slice(2);

        return { news: regularNews, alerts };
    } catch (error) {
        console.warn("Returning MOCK INDUSTRY NEWS (API Failure)", error);
        return generateMockData();
    }
};

export const fetchBlogPosts = async (sourceName: string, url: string): Promise<NewsItem[]> => {
    const generateMockBlogs = () => [
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

    try {
        // Use backend proxy to fetch blog RSS feed
        const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';
        const apiUrl = `${backendUrl}/api/rss-feed`;
        const token = localStorage.getItem('authToken') || 'DEV_TOKEN_REASONEX';

        console.log('[Frontend] Fetching blog posts from:', url);

        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ url })
        });

        if (!response.ok) throw new Error('Blog Feed API Failed');

        const xmlText = await response.text();
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
        const items = xmlDoc.querySelectorAll('item');

        const blogs: NewsItem[] = Array.from(items).slice(0, 5).map(item => {
            const title = item.querySelector('title')?.textContent || 'No title';
            const link = item.querySelector('link')?.textContent || url;
            const description = item.querySelector('description')?.textContent || '';
            const pubDate = item.querySelector('pubDate')?.textContent || '';

            return {
                title,
                source: sourceName,
                url: link,
                snippet: description.substring(0, 150) + '...',
                date: pubDate ? new Date(pubDate).toLocaleDateString() : 'Recent'
            };
        });

        return blogs;
    } catch (error) {
        console.warn("Returning MOCK BLOG POSTS (API Failure)", error);
        return generateMockBlogs();
    }
};
