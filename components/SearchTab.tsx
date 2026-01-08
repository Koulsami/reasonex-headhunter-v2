import React, { useState } from 'react';
import { searchLinkedInCandidates } from '../services/geminiService';
import { Candidate, Client, User, Job } from '../types';
import CreateProjectModal from './CreateProjectModal';

interface SearchTabProps {
  existingClients: Client[];
  existingJobs: Job[];
  users: User[];
  onAddCandidates: (jobId: string, candidates: Partial<Candidate>[], assigneeId: string) => void;
  onCreateProject: (projectData: {
    clientName: string;
    position: string;
    country: string;
    city: string;
    experienceLevel: string;
    employmentType: string;
  }) => Promise<Job>;
}

const SearchTab: React.FC<SearchTabProps> = ({ existingClients, existingJobs, users, onAddCandidates, onCreateProject }) => {
  // State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedJobId, setSelectedJobId] = useState<string>('');
  const [jdText, setJdText] = useState('');
  const [assigneeId, setAssigneeId] = useState(users[0]?.id || '');

  // New state for sliders
  const [numCandidatesAnalyze, setNumCandidatesAnalyze] = useState<number>(50);
  const [numCandidatesOutput, setNumCandidatesOutput] = useState<number>(10);

  const [loading, setLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);

  const [generatedCandidates, setGeneratedCandidates] = useState<Partial<Candidate>[]>([]);

  // State for card expansion
  const [expandedCardIndex, setExpandedCardIndex] = useState<number | null>(null);

  const resetResults = () => {
    setGeneratedCandidates([]);
    setExpandedCardIndex(null);
  };

  const handleCreateProject = async (projectData: any) => {
    const newJob = await onCreateProject(projectData);
    setSelectedJobId(newJob.id);
    setShowCreateModal(false);
    alert(`Project "${projectData.position}" created successfully! You can now start searching for candidates.`);
  };

  const handleSearch = async () => {
    if (!selectedJobId) {
      alert('Please select a project first');
      return;
    }
    if (!jdText.trim()) {
      alert('Please enter a job description');
      return;
    }

    const selectedJob = existingJobs.find(j => j.id === selectedJobId);
    if (!selectedJob) {
      alert('Selected project not found');
      return;
    }

    setLoading(true);
    setLoadingProgress(0);
    resetResults();

    // Simulate progress bar animation
    const progressInterval = setInterval(() => {
      setLoadingProgress(prev => {
        if (prev >= 90) return prev;
        return prev + Math.random() * 15;
      });
    }, 500);

    try {
      const jobContext = `${selectedJob.title}\n\n${jdText}`;
      const country = selectedJob.country || 'United States';

      console.log('Starting LinkedIn Search with:', { jobContext, country, numCandidatesAnalyze, numCandidatesOutput });

      const searchResponse = await searchLinkedInCandidates(jobContext, country, numCandidatesAnalyze, numCandidatesOutput);

      console.log('Search response received', searchResponse);

      // Complete the progress bar
      setLoadingProgress(100);

      setGeneratedCandidates(searchResponse.candidates);

      if (searchResponse.candidates.length === 0) {
        alert("Search completed but no candidates were returned. Try adjusting your parameters.");
      }

    } catch (err: any) {
      console.error("Search Error:", err);
      alert(`Failed to process LinkedIn search: ${err.message}`);
    } finally {
      clearInterval(progressInterval);
      setLoading(false);
      setLoadingProgress(0);
    }
  };

  const handleRemoveCandidate = (index: number) => {
    setGeneratedCandidates(prev => prev.filter((_, i) => i !== index));
    if (expandedCardIndex === index) setExpandedCardIndex(null);
  };

  const handleConfirmAdd = () => {
    if (!selectedJobId) {
      alert('Please select a project first');
      return;
    }
    onAddCandidates(selectedJobId, generatedCandidates, assigneeId);
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

  const selectedJob = existingJobs.find(j => j.id === selectedJobId);

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Create Project Modal */}
      {showCreateModal && (
        <CreateProjectModal
          existingClients={existingClients}
          onClose={() => setShowCreateModal(false)}
          onCreateProject={handleCreateProject}
        />
      )}

      {/* Main Search Panel */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h2 className="text-xl font-semibold text-slate-800 mb-2 flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-600">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="22" y1="12" x2="18" y2="12"></line>
                <line x1="6" y1="12" x2="2" y2="12"></line>
                <line x1="12" y1="6" x2="12" y2="2"></line>
                <line x1="12" y1="22" x2="12" y2="18"></line>
              </svg>
              Search Candidates
            </h2>
            <p className="text-sm text-slate-500">Select a project and search for candidates using different job descriptions</p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 rounded-lg font-medium text-white bg-green-600 hover:bg-green-700 shadow-lg shadow-green-500/30 transition-all flex items-center gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            New Project
          </button>
        </div>

        {/* Project Selection & Assignee Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-2">
              Select Project <span className="text-red-500">*</span>
            </label>
            <select
              className="w-full p-3 border-2 border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-sm"
              value={selectedJobId}
              onChange={(e) => {
                setSelectedJobId(e.target.value);
                resetResults();
              }}
            >
              <option value="">-- Choose a Project --</option>
              {existingJobs.filter(j => j.status === 'Active').map(job => {
                const client = existingClients.find(c => c.id === job.clientId);
                return (
                  <option key={job.id} value={job.id}>
                    {job.title} ({client?.name || 'Unknown Client'}) - {job.country || 'No Location'}
                  </option>
                );
              })}
            </select>
            {existingJobs.filter(j => j.status === 'Active').length === 0 && (
              <p className="text-xs text-orange-600 mt-1">
                No active projects found. Create a new project to get started.
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-600 mb-2">Assign Recruiter</label>
            <select
              className="w-full p-3 border-2 border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-sm bg-yellow-50 border-yellow-200"
              value={assigneeId}
              onChange={(e) => setAssigneeId(e.target.value)}
            >
              {users.map(u => (
                <option key={u.id} value={u.id}>{u.name} {u.role === 'AI' ? '(AI)' : ''}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Project Info Card (shown when project is selected) */}
        {selectedJob && (
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <h3 className="text-lg font-bold text-slate-800 mb-2">{selectedJob.title}</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                  <div>
                    <span className="text-xs text-slate-500 block">Client</span>
                    <span className="font-semibold text-slate-700">
                      {existingClients.find(c => c.id === selectedJob.clientId)?.name || 'Unknown'}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 block">Location</span>
                    <span className="font-semibold text-slate-700">
                      {selectedJob.city ? `${selectedJob.city}, ${selectedJob.country}` : selectedJob.country || 'Not specified'}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 block">Experience Level</span>
                    <span className="font-semibold text-slate-700">{selectedJob.experienceLevel || 'Not specified'}</span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 block">Employment Type</span>
                    <span className="font-semibold text-slate-700">{selectedJob.employmentType || 'Not specified'}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

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

        {/* Job Description Input */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-2">
              Job Description / Search Criteria <span className="text-red-500">*</span>
            </label>
            <textarea
              className="w-full h-48 p-4 border-2 border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary resize-none text-sm"
              placeholder="Enter job description here... You can run multiple searches with different variations for the same project."
              value={jdText}
              onChange={(e) => setJdText(e.target.value)}
              disabled={!selectedJobId}
            />
            {!selectedJobId && (
              <p className="text-xs text-orange-600 mt-1">Please select a project first</p>
            )}
          </div>

          <div className="flex justify-end gap-3">
            {loading ? (
              <div className="flex-1 max-w-md">
                <div className="mb-2 flex justify-between items-center">
                  <span className="text-sm font-medium text-slate-700">Searching LinkedIn...</span>
                  <span className="text-sm font-medium text-blue-600">{Math.round(loadingProgress)}%</span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden shadow-inner">
                  <div
                    className="bg-gradient-to-r from-blue-500 via-purple-500 to-indigo-600 h-full rounded-full transition-all duration-500 ease-out shadow-lg"
                    style={{ width: `${loadingProgress}%` }}
                  >
                    <div className="h-full w-full bg-gradient-to-r from-transparent via-white to-transparent opacity-30 animate-pulse"></div>
                  </div>
                </div>
              </div>
            ) : (
              <button
                onClick={handleSearch}
                disabled={!selectedJobId || !jdText.trim()}
                className={`px-6 py-3 rounded-lg font-medium text-white shadow-lg transition-all flex items-center gap-2 ${
                  !selectedJobId || !jdText.trim()
                    ? 'bg-slate-300 cursor-not-allowed'
                    : 'bg-primary hover:bg-blue-700 shadow-blue-500/30'
                }`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8"></circle>
                  <path d="m21 21-4.35-4.35"></path>
                </svg>
                Search LinkedIn
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Results */}
      {generatedCandidates.length > 0 && (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
              Review Candidates
              <span className="text-xs px-2 py-1 bg-green-50 text-green-700 rounded-full">{generatedCandidates.length} Found</span>
            </h3>

            <button
              onClick={handleConfirmAdd}
              disabled={generatedCandidates.length === 0}
              className={`px-6 py-2 rounded-lg font-medium text-white flex items-center gap-2 transition-all ${
                generatedCandidates.length === 0 ? 'bg-slate-300 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700 shadow-lg shadow-green-500/20'
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14"/></svg>
              Add to Pipeline
            </button>
          </div>

          {/* Assignee Info Banner */}
          <div className="mb-4 bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-center gap-3">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${users.find(u => u.id === assigneeId)?.color || 'bg-slate-200'}`}>
              {users.find(u => u.id === assigneeId)?.avatar || '?'}
            </div>
            <div className="flex-1">
              <p className="text-sm text-slate-700">
                <span className="font-semibold">{users.find(u => u.id === assigneeId)?.name}</span> will be assigned to all {generatedCandidates.length} candidate{generatedCandidates.length > 1 ? 's' : ''}.
              </p>
            </div>
          </div>

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
        </div>
      )}
    </div>
  );
};

export default SearchTab;
