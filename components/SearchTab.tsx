import React, { useState } from 'react';
import { analyzeJobDescription, performCandidateSearch, searchInternalCandidates, searchLinkedInCandidates } from '../services/geminiService';
import { SearchResult, Candidate, Client, User, RawSearchResult } from '../types';

interface SearchTabProps {
  existingClients: Client[];
  users: User[];
  onAddCandidates: (clientName: string, jobTitle: string, jdText: string, candidates: Partial<Candidate>[], assigneeId: string) => void;
}

const SearchTab: React.FC<SearchTabProps> = ({ existingClients, users, onAddCandidates }) => {
  // PRE-FILLED DEFAULTS FOR INSTANT TESTING
  const [jdText, setJdText] = useState('We are looking for a Senior React Developer with experience in TypeScript, TailwindCSS, and Node.js. 5+ years experience required. Remote friendly.');
  const [clientName, setClientName] = useState('Acme Corp');
  const [jobTitle, setJobTitle] = useState('Senior React Developer');
  const [country, setCountry] = useState('United States');
  const [city, setCity] = useState('');
  const [assigneeId, setAssigneeId] = useState(users[0]?.id || '');
  
  // New state for sliders
  const [numCandidatesAnalyze, setNumCandidatesAnalyze] = useState<number>(50);
  const [numCandidatesOutput, setNumCandidatesOutput] = useState<number>(10);
  
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState<string>('');
  
  const [rawResponse, setRawResponse] = useState<string>('');
  const [generatedCandidates, setGeneratedCandidates] = useState<Partial<Candidate>[]>([]);
  const [searchSource, setSearchSource] = useState<'linkedin' | 'db' | 'combined' | null>(null);
  
  // State for card expansion
  const [expandedCardIndex, setExpandedCardIndex] = useState<number | null>(null);

  const resetResults = () => {
    setRawResponse('');
    setGeneratedCandidates([]);
    setSearchSource(null);
    setExpandedCardIndex(null);
  };

  const validateSearchInputs = (requireCountry: boolean = false) => {
    const missing: string[] = [];
    if (!clientName.trim()) missing.push("Client Name");
    if (!jobTitle.trim()) missing.push("Job Title");
    if (!jdText.trim()) missing.push("Job Description");
    if (requireCountry && !country.trim()) missing.push("Target Country");

    if (missing.length > 0) {
      alert(`Please fill in the following fields: ${missing.join(', ')}`);
      return false;
    }
    return true;
  };

  const handleLinkedInSearch = async () => {
    if (!validateSearchInputs(true)) return;
    
    setLoading(true);
    resetResults();
    setSearchSource('linkedin');

    try {
      setLoadingStep('Connecting to HeadHunter Network...');
      
      const jobContext = `${jobTitle}\n\n${jdText}`;
      console.log('Starting LinkedIn Search with:', { jobContext, country, numCandidatesAnalyze, numCandidatesOutput });
      
      const searchResponse = await searchLinkedInCandidates(jobContext, country, numCandidatesAnalyze, numCandidatesOutput);

      console.log('Search response received', searchResponse);
      console.log('First candidate:', searchResponse.candidates[0]);
      setRawResponse(searchResponse.rawResponse);
      setGeneratedCandidates(searchResponse.candidates);
      console.log('Candidates set in state, first candidate:', searchResponse.candidates[0]);
      
      if (searchResponse.candidates.length === 0) {
        alert("Search completed but no candidates were returned. Try adjusting your parameters or checking the Raw API Response.");
      }
      
    } catch (err: any) {
      console.error("Search Error:", err);
      alert(`Failed to process LinkedIn search: ${err.message}`);
    } finally {
      setLoading(false);
      setLoadingStep('');
    }
  };

  const handleResumeDBSearch = async () => {
    if (!validateSearchInputs()) return;
    
    setLoading(true);
    resetResults();
    setSearchSource('db');

    try {
      setLoadingStep('Searching Internal Resume Database...');
      const searchResponse = await searchInternalCandidates(jdText);
      
      setRawResponse(searchResponse.rawResponse);
      
      const candidates = searchResponse.candidates.map((m: any) => ({
        ...m,
        name: m.name,
        role: m.role || jobTitle,
        company: m.company || "Internal Applicant",
        matchScore: m.matchScore || 80,
        email: `${m.name.toLowerCase().replace(' ', '.')}@internal.com`,
        source: 'Internal'
      }));
      setGeneratedCandidates(candidates);

    } catch (err) {
      console.error(err);
      alert("Failed to search internal database.");
    } finally {
      setLoading(false);
      setLoadingStep('');
    }
  };

  const handleCombinedSearch = async () => {
    if (!validateSearchInputs(true)) return;
    
    setLoading(true);
    resetResults();
    setSearchSource('combined');

    try {
      setLoadingStep('Running comprehensive search (LinkedIn + Internal DB)...');
      
      const jobContext = `${jobTitle}\n\n${jdText}`;
      
      const [linkedInResponse, dbResponse] = await Promise.all([
        searchLinkedInCandidates(jobContext, country, numCandidatesAnalyze, numCandidatesOutput).catch(e => {
            console.error("LinkedIn search failed", e);
            return { rawResponse: `Error: ${e.message}`, rawResults: [], candidates: [] };
        }),
        searchInternalCandidates(jdText).catch(e => {
            console.error("DB search failed", e);
            return { rawResponse: "{}", rawResults: [], candidates: [] };
        })
      ]);

      const processedDBCandidates = dbResponse.candidates.map((m: any) => ({
        ...m,
        role: m.role || jobTitle,
        company: m.company || "Internal Applicant",
        matchScore: m.matchScore || 80,
        email: `${m.name.toLowerCase().replace(' ', '.')}@internal.com`,
        source: 'Internal'
      }));

      const mergedCandidates = [...linkedInResponse.candidates, ...processedDBCandidates];

      setRawResponse(JSON.stringify({
          linkedin: JSON.parse(linkedInResponse.rawResponse || '{}'),
          internal: JSON.parse(dbResponse.rawResponse || '{}')
      }));
      setGeneratedCandidates(mergedCandidates);
      
      if (mergedCandidates.length === 0) {
        alert("Combined search completed but no candidates were returned.");
      }

    } catch (err) {
      console.error(err);
      alert("Failed to process combined search.");
    } finally {
      setLoading(false);
      setLoadingStep('');
    }
  };

  const handleRemoveCandidate = (index: number) => {
    setGeneratedCandidates(prev => prev.filter((_, i) => i !== index));
    if (expandedCardIndex === index) setExpandedCardIndex(null);
  };

  const handleConfirmAdd = () => {
    onAddCandidates(clientName, jobTitle, jdText, generatedCandidates, assigneeId);
  };

  const toggleExpand = (index: number) => {
    setExpandedCardIndex(expandedCardIndex === index ? null : index);
  };

  // Helper to render initials if no image
  const renderAvatar = (name: string, url?: string) => {
    if (url && url.length > 10) {
      return <img src={url} alt={name} className="w-12 h-12 rounded-full object-cover border border-slate-200" />;
    }
    const initials = name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    return (
      <div className="w-12 h-12 rounded-full bg-slate-200 text-slate-500 flex items-center justify-center font-bold text-lg">
        {initials}
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* 1. Setup Panel */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <h2 className="text-xl font-semibold text-slate-800 mb-4 flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-600">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="22" y1="12" x2="18" y2="12"></line>
            <line x1="6" y1="12" x2="2" y2="12"></line>
            <line x1="12" y1="6" x2="12" y2="2"></line>
            <line x1="12" y1="22" x2="12" y2="18"></line>
          </svg>
          Head Hunting
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-2">Client Name</label>
            <input
              list="clients-list"
              type="text"
              className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
              placeholder="e.g. Acme Corp"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
            />
            <datalist id="clients-list">
              {existingClients.map(c => <option key={c.id} value={c.name} />)}
            </datalist>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-2">Job Title (Project Name)</label>
            <input
              type="text"
              className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
              placeholder="e.g. Senior Backend Engineer"
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-2">Target Country</label>
            <input
              type="text"
              className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
              placeholder="e.g. United States"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-2">City</label>
            <select
              className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
              value={city}
              onChange={(e) => setCity(e.target.value)}
            >
              <option value="">Any City</option>
              <optgroup label="India">
                <option value="Mumbai">Mumbai</option>
                <option value="Delhi">Delhi</option>
                <option value="Bangalore">Bangalore</option>
                <option value="Hyderabad">Hyderabad</option>
                <option value="Chennai">Chennai</option>
                <option value="Pune">Pune</option>
                <option value="Kolkata">Kolkata</option>
              </optgroup>
              <optgroup label="Singapore">
                <option value="Singapore">Singapore</option>
              </optgroup>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-2">Assign Recruiter</label>
            <select
              className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-sm bg-yellow-50 border-yellow-200 text-yellow-800"
              value={assigneeId}
              onChange={(e) => setAssigneeId(e.target.value)}
            >
              {users.map(u => (
                <option key={u.id} value={u.id}>{u.name} {u.role === 'AI' ? '(AI)' : ''}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Sliders for API Configuration */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6 p-4 bg-slate-50 rounded-lg border border-slate-200">
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-sm font-medium text-slate-700 flex items-center gap-1">
                Candidates to Analyze
                <span className="text-xs font-normal text-slate-500">(Google Processing)</span>
              </label>
              <span className="text-sm font-bold text-primary bg-blue-50 px-2 py-0.5 rounded border border-blue-100">{numCandidatesAnalyze}</span>
            </div>
            <input 
              type="range" 
              min="1" 
              max="500" 
              value={numCandidatesAnalyze} 
              onChange={(e) => setNumCandidatesAnalyze(Number(e.target.value))}
              className="w-full h-2 bg-slate-300 rounded-lg appearance-none cursor-pointer accent-primary"
            />
            <div className="flex justify-between text-[10px] text-slate-400 mt-1">
              <span>1</span>
              <span>250</span>
              <span>500</span>
            </div>
          </div>
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-sm font-medium text-slate-700 flex items-center gap-1">
                Candidates to Shortlist
                <span className="text-xs font-normal text-slate-500">(Final Output)</span>
              </label>
              <span className="text-sm font-bold text-primary bg-blue-50 px-2 py-0.5 rounded border border-blue-100">{numCandidatesOutput}</span>
            </div>
            <input 
              type="range" 
              min="1" 
              max="100" 
              value={numCandidatesOutput} 
              onChange={(e) => setNumCandidatesOutput(Number(e.target.value))}
              className="w-full h-2 bg-slate-300 rounded-lg appearance-none cursor-pointer accent-primary"
            />
            <div className="flex justify-between text-[10px] text-slate-400 mt-1">
              <span>1</span>
              <span>50</span>
              <span>100</span>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-2">Job Description</label>
            <textarea 
              className="w-full h-48 p-4 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent resize-none text-sm"
              placeholder="Paste the full job description here..."
              value={jdText}
              onChange={(e) => setJdText(e.target.value)}
            />
          </div>
          <div className="flex justify-end gap-3 flex-wrap">
            {loading ? (
              <button 
                disabled
                className="px-6 py-2.5 rounded-lg font-medium text-white bg-slate-400 cursor-not-allowed flex items-center gap-2"
              >
                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                {loadingStep}
              </button>
            ) : (
              <>
                <button 
                  onClick={handleResumeDBSearch}
                  className="px-4 py-2.5 rounded-lg font-medium border bg-white text-indigo-700 border-indigo-200 hover:bg-indigo-50 hover:border-indigo-300 shadow-sm transition-all"
                >
                   Search Resume DB
                </button>
                <button 
                  onClick={handleLinkedInSearch}
                  className="px-4 py-2.5 rounded-lg font-medium text-white bg-primary hover:bg-blue-700 shadow-lg shadow-blue-500/30 transition-all"
                >
                   Search LinkedIn
                </button>
                <button 
                  onClick={handleCombinedSearch}
                  className="px-4 py-2.5 rounded-lg font-medium text-white bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 shadow-lg shadow-indigo-500/30 transition-all"
                >
                   Search Linkedin+Resume DB
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {(generatedCandidates.length > 0 || rawResponse) && (
        <div className="space-y-6">
           
           {/* Raw Data Debug Toggle */}
           {rawResponse && (
             <details className="group">
               <summary className="cursor-pointer text-xs text-slate-400 mb-2 hover:text-slate-600 select-none">Show Raw API Response</summary>
               <div className="bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-800">
                 <pre className="bg-slate-950 p-4 rounded-lg border border-slate-800 text-xs text-green-400 font-mono overflow-auto max-h-64">
                   {JSON.stringify(JSON.parse(rawResponse), null, 2)}
                 </pre>
               </div>
             </details>
           )}

           <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col">
             <div className="flex justify-between items-center mb-6">
               <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                 Review Candidates
                 <span className="text-xs px-2 py-1 bg-green-50 text-green-700 rounded-full">{generatedCandidates.length} Found</span>
               </h3>
               
               <div className="group relative">
                <button 
                    onClick={handleConfirmAdd}
                    disabled={generatedCandidates.length === 0}
                    className={`px-6 py-2 rounded-lg font-medium text-white flex items-center gap-2 transition-all ${
                        generatedCandidates.length === 0 ? 'bg-slate-300 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700 shadow-lg shadow-green-500/20'
                    }`}
                    >
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14"/></svg>
                    Import Selected Candidates
                </button>
                {generatedCandidates.length === 0 && (
                    <div className="absolute bottom-full mb-2 right-0 w-48 bg-slate-800 text-white text-xs p-2 rounded shadow-lg hidden group-hover:block">
                        Perform a search to find candidates first.
                    </div>
                )}
               </div>
             </div>
             
             {generatedCandidates.length === 0 ? (
                 <div className="text-center py-12 text-slate-400 bg-slate-50 rounded-lg border border-dashed border-slate-200">
                    <svg className="w-12 h-12 mx-auto mb-3 opacity-50" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 21h7a2 2 0 0 02-2V9.414a1 1 0 0 0-.293-.707l-5.414-5.414A1 1 0 0 0 12.586 3H7a2 2 0 0 0-2 2v11m0 5l4.879-4.879m0 0a3 3 0 1 04.243-4.242 3 3 0 0 0-4.243 4.242z" /></svg>
                    <p>No candidates found matching your criteria.</p>
                    <p className="text-xs mt-1">Try adjusting the sliders or refining the job description.</p>
                 </div>
             ) : (
                <div className="grid grid-cols-1 gap-4">
                    {generatedCandidates.map((candidate, idx) => (
                    <div 
                        key={idx} 
                        className={`rounded-xl border transition-all duration-200 overflow-hidden ${
                        expandedCardIndex === idx 
                            ? 'bg-blue-50/50 border-blue-200 ring-1 ring-blue-100 shadow-md' 
                            : 'bg-white border-slate-200 hover:shadow-md hover:border-slate-300'
                        }`}
                    >
                        <div className="p-4 flex gap-4 cursor-pointer" onClick={() => toggleExpand(idx)}>
                            {/* Avatar */}
                            <div className="flex-shrink-0">
                            {renderAvatar(candidate.name || 'Unknown', candidate.imageUrl)}
                            </div>

                            {/* Main Info */}
                            <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-start">
                                <div>
                                <h4 className="text-lg font-bold text-slate-800 hover:text-primary transition-colors flex items-center gap-2">
                                    {candidate.linkedinUrl ? (
                                    <a href={candidate.linkedinUrl} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="hover:underline">
                                        {candidate.name}
                                    </a>
                                    ) : (
                                    candidate.name
                                    )}
                                    {candidate.source && (
                                    <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-slate-100 text-slate-500">
                                        {candidate.source}
                                    </span>
                                    )}
                                </h4>
                                <div className="text-sm text-slate-600 font-medium mb-1">
                                    {candidate.role} {candidate.company !== 'External' ? `at ${candidate.company}` : ''}
                                </div>
                                
                                {!expandedCardIndex && (
                                    <div className="text-xs text-slate-500 line-clamp-1">
                                    {candidate.summary || 'Click to view details...'}
                                    </div>
                                )}
                                </div>
                                
                                <div className="flex flex-col items-end gap-2">
                                    <div className="flex items-center gap-1">
                                    <span className={`text-lg font-bold ${
                                        (candidate.matchScore || 0) >= 90 ? 'text-green-600' :
                                        (candidate.matchScore || 0) >= 75 ? 'text-yellow-600' : 'text-slate-400'
                                    }`}>
                                        {candidate.matchScore}
                                    </span>
                                    <span className="text-xs text-slate-400 uppercase font-medium">Score</span>
                                    </div>
                                    
                                    {candidate.fitLevel && (
                                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wide ${
                                        candidate.fitLevel.toLowerCase() === 'strong' ? 'bg-green-100 text-green-700' :
                                        candidate.fitLevel.toLowerCase() === 'maybe' ? 'bg-yellow-100 text-yellow-700' :
                                        'bg-slate-100 text-slate-600'
                                    }`}>
                                        {candidate.fitLevel} Fit
                                    </span>
                                    )}
                                </div>
                            </div>
                            </div>

                            {/* Actions */}
                            <div className="flex flex-col gap-2 ml-2 border-l border-slate-100 pl-4 justify-center">
                            <button 
                                onClick={(e) => { e.stopPropagation(); handleRemoveCandidate(idx); }}
                                className="p-2 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                                title="Delete Candidate"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
                            </button>
                            <button 
                                className={`p-2 rounded-lg transition-colors ${expandedCardIndex === idx ? 'bg-blue-100 text-blue-600' : 'text-slate-400 hover:bg-slate-100'}`}
                                title={expandedCardIndex === idx ? "Collapse" : "Expand Details"}
                            >
                                <svg className={`transform transition-transform ${expandedCardIndex === idx ? 'rotate-180' : ''}`} xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                            </button>
                            </div>
                        </div>

                        {/* Expanded Content */}
                        {expandedCardIndex === idx && (
                        <div className="bg-slate-50 border-t border-slate-200/60 p-4 pl-20 grid grid-cols-1 md:grid-cols-2 gap-6 animate-fadeIn">
                            <div>
                                <h5 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Analysis</h5>
                                
                                {candidate.strengths && (
                                <div className="mb-3">
                                    <span className="text-xs font-semibold text-green-700 block mb-1">Strengths</span>
                                    <ul className="space-y-1">
                                    {candidate.strengths.split('|').map((s, i) => (
                                        <li key={i} className="text-xs text-slate-600 flex items-start gap-1.5">
                                        <svg className="w-3.5 h-3.5 text-green-500 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                                        {s.trim()}
                                        </li>
                                    ))}
                                    </ul>
                                </div>
                                )}

                                {candidate.concerns && (
                                <div>
                                    <span className="text-xs font-semibold text-orange-700 block mb-1">Concerns / Gaps</span>
                                    <ul className="space-y-1">
                                    {candidate.concerns.split('|').map((s, i) => (
                                        <li key={i} className="text-xs text-slate-600 flex items-start gap-1.5">
                                        <svg className="w-3.5 h-3.5 text-orange-400 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                                        {s.trim()}
                                        </li>
                                    ))}
                                    </ul>
                                </div>
                                )}
                            </div>

                            <div>
                                <h5 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Profile Summary</h5>
                                <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">
                                {candidate.summary || 'No summary available.'}
                                </p>
                            </div>
                        </div>
                        )}
                    </div>
                    ))}
                </div>
             )}
           </div>
        </div>
      )}
    </div>
  );
};

export default SearchTab;