
/**
 * Represents the recruitment pipeline stages.
 * Flow: Identified -> Analyzed -> Contacted -> Screening -> Interview -> Offer -> Hired/Rejected
 */
export type Stage = 
  | 'Identified' 
  | 'Analyzed' 
  | 'Contacted' 
  | 'Screening' 
  | 'Interview' 
  | 'Offer' 
  | 'Hired' 
  | 'Rejected';

/**
 * System User (Recruiter or Admin).
 * 'AI' role denotes automated actions performed by the system.
 */
export interface User {
  id: string;
  name: string;
  avatar: string; // URL or 2-letter initials
  role: 'Recruiter' | 'Manager' | 'AI';
  color: string; // Tailwind class string (e.g., 'bg-blue-100 text-blue-700')
}

/**
 * Corporate Client (The company hiring).
 */
export interface Client {
  id: string;
  name: string;
  industry: string;
  website?: string;
}

/**
 * Experience level for a job position (aligned with LinkedIn)
 */
export type ExperienceLevel = 'Entry Level' | 'Mid Level' | 'Senior Level' | 'Executive';

/**
 * Employment type for a position
 */
export type EmploymentType = 'Full-time' | 'Contract' | 'Part-time' | 'Temporary';

/**
 * A specific Job Opening / Requisition (also called "Project").
 */
export interface Job {
  id: string;
  clientId: string;
  assigneeId?: string; // ID of the User/Recruiter responsible
  title: string;
  description?: string;
  status: 'Active' | 'Closed' | 'Suspended' | 'Expired';
  createdAt: string; // ISO Date String

  // Project-specific fields
  country?: string; // Location - Country
  city?: string; // Location - City
  experienceLevel?: ExperienceLevel; // Seniority level
  employmentType?: EmploymentType; // Contract or Full-time
}

/**
 * Stage-specific note for a candidate
 */
export interface CandidateNote {
  stage: Stage;
  note: string;
  timestamp: string;
  author: string;
}

/**
 * A Candidate profile associated with a specific Job.
 */
export interface Candidate {
  id: string;
  jobId: string;
  assigneeId?: string;
  name: string;
  role: string;
  company: string;
  stage: Stage;
  matchScore: number; // 0-100 score based on AI analysis
  email: string;
  addedAt: string; // ISO Date String

  // AI/Enrichment Data
  linkedinUrl?: string;
  imageUrl?: string;
  fitLevel?: string; // 'Strong', 'Good', 'Maybe'
  strengths?: string; // Pipe-delimited string of key strengths
  concerns?: string; // Pipe-delimited string of potential red flags
  summary?: string; // AI generated summary
  source?: 'LinkedIn' | 'Internal' | 'Google' | 'Manual';

  // Notes history
  notes?: CandidateNote[];
}

export interface NewsItem {
  title: string;
  source: string;
  url: string;
  snippet: string;
  date: string;
}

/**
 * Result of AI Job Description Analysis.
 */
export interface SearchResult {
  booleanString: string; // Boolean search string (e.g. "React AND (Node OR Express)")
  keywords: string[]; // Extracted key skills
}

export interface RawSearchResult {
  title: string;
  url: string;
  snippet: string;
}

export interface CandidateSearchResponse {
  rawResponse: string; // The raw JSON/Text string from the AI/API for debugging
  rawResults: RawSearchResult[];
  candidates: Partial<Candidate>[];
}

export interface AuditLog {
  id: string;
  actor_email: string;
  event_type: string;
  resource_type: string;
  resource_id?: string;
  payload: any;
  created_at: string;
}

export interface SystemStats {
  totalCandidates: number;
  totalJobs: number;
  activeJobs: number;
  totalClients: number;
  apiCallsLast24h: number;
}

export interface SystemConfig {
  linkedinApiUrl: string; // Webhook URL for external scraper
  jobAlertsApiUrl: string; // Webhook URL for job market alerts
  googleSearchEnabled: boolean;
}
