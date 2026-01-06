import React, { useState, useEffect } from 'react';
import { Candidate, Stage, Client, Job, User } from '../types';

interface KanbanTabProps {
  clients: Client[];
  jobs: Job[];
  candidates: Candidate[];
  users: User[];
  onMoveCandidate: (id: string, newStage: Stage) => void;
  onAssignCandidate: (candidateId: string, userId: string) => void;
  onAssignJob: (jobId: string, userId: string) => void;
  onUpdateJobStatus: (jobId: string, status: Job['status']) => void;
  onRemoveCandidate: (candidateId: string) => void;
  onAddNote: (candidateId: string, note: string, stage: Stage) => void;
}

const STAGES: Stage[] = ['Identified', 'Analyzed', 'Contacted', 'Screening', 'Interview', 'Offer', 'Hired', 'Rejected'];

const KanbanTab: React.FC<KanbanTabProps> = ({
  clients,
  jobs,
  candidates,
  users,
  onMoveCandidate,
  onAssignCandidate,
  onAssignJob,
  onUpdateJobStatus,
  onRemoveCandidate,
  onAddNote
}) => {
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showNotesDropdown, setShowNotesDropdown] = useState<string | null>(null);
  const [newNote, setNewNote] = useState<string>('');
  
  // By default, we only show Active projects. User can toggle to see archived.
  const [filterActiveOnly, setFilterActiveOnly] = useState(true);

  // Auto-select first active job on load
  useEffect(() => {
    if (!selectedJobId && jobs.length > 0) {
      const firstActive = jobs.find(j => j.status === 'Active');
      if (firstActive) {
          setSelectedJobId(firstActive.id);
      } else if (jobs.length > 0 && !filterActiveOnly) {
          setSelectedJobId(jobs[0].id);
      }
    }
  }, [jobs, selectedJobId, filterActiveOnly]);

  const selectedJob = jobs.find(j => j.id === selectedJobId);
  const activeCandidates = selectedJobId ? candidates.filter(c => c.jobId === selectedJobId) : [];

  const getUser = (id?: string) => users.find(u => u.id === id);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

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

  const handleCloseModal = () => {
    setSelectedCandidate(null);
  };

  const handleDeleteFromModal = () => {
    if (selectedCandidate) {
        onRemoveCandidate(selectedCandidate.id);
        handleCloseModal();
    }
  };

  const handleAIAnalyze = () => {
    if (!selectedJobId) return;
    setIsAnalyzing(true);
    // Simulate AI analysis process
    setTimeout(() => {
      setIsAnalyzing(false);
      alert(`AI Analysis complete for job: ${selectedJob?.title}. Candidates have been enriched with latest data.`);
    }, 2000);
  };

  const handleExportCSV = () => {
    const headers = ['Name', 'Role', 'Company', 'Stage', 'Match Score', 'Job Title', 'Client', 'Email', 'Source', 'LinkedIn URL'];
    
    // Flatten the data for export
    const rows = candidates.map(c => {
       const job = jobs.find(j => j.id === c.jobId);
       const client = clients.find(cl => cl.id === job?.clientId);
       
       return [
         c.name, 
         c.role, 
         c.company, 
         c.stage, 
         `${c.matchScore}%`, 
         job?.title || 'Unknown Job', 
         client?.name || 'Unknown Client',
         c.email,
         c.source || 'Manual',
         c.linkedinUrl || ''
       ].map(field => `"${String(field).replace(/"/g, '""')}"`).join(','); // Escape quotes
    });
    
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    const timestamp = new Date().toISOString().slice(0, 10);
    link.setAttribute("download", `candidates_export_${timestamp}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] relative">
      <div className="flex flex-1 gap-6 overflow-hidden pb-16">
        {/* LEFT SIDEBAR: Project Explorer */}
        <div className="w-72 flex-shrink-0 bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col overflow-hidden">
          <div className="p-4 border-b border-slate-100 bg-slate-50">
            <div className="flex justify-between items-center mb-1">
              <h3 className="font-semibold text-slate-800">Projects</h3>
              <div className="relative group">
                 <button 
                   onClick={() => setFilterActiveOnly(!filterActiveOnly)}
                   className="text-xs font-medium text-blue-600 hover:text-blue-800 underline decoration-dashed underline-offset-2"
                 >
                   {filterActiveOnly ? 'Show All' : 'Show Active Only'}
                 </button>
              </div>
            </div>
            <p className="text-xs text-slate-500">
               {filterActiveOnly ? 'Viewing Active Projects' : 'Viewing All Projects'}
            </p>
          </div>
          
          <div className="flex-1 overflow-y-auto p-2 space-y-4">
            {clients.map(client => {
              // Filter jobs based on the visibility setting
              const clientJobs = jobs.filter(j => {
                  const belongsToClient = j.clientId === client.id;
                  const matchesStatus = filterActiveOnly ? j.status === 'Active' : true;
                  return belongsToClient && matchesStatus;
              });

              if (clientJobs.length === 0) return null;

              return (
                <div key={client.id}>
                  <div className="px-2 py-1 text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                    {client.name}
                  </div>
                  <div className="space-y-1">
                    {clientJobs.map(job => {
                      const assignee = getUser(job.assigneeId);
                      const isSelected = selectedJobId === job.id;
                      const isUnassigned = !job.assigneeId;
                      const isActive = job.status === 'Active';
                      
                      return (
                        <div 
                          key={job.id}
                          className={`w-full rounded-lg transition-all border group relative ${
                            isSelected 
                              ? 'bg-blue-50 border-blue-200 ring-1 ring-blue-100' 
                              : !isActive
                                ? 'bg-slate-100 border-slate-200 opacity-75'
                                : isUnassigned
                                  ? 'bg-orange-50 border-orange-200 hover:bg-orange-100'
                                  : 'bg-white border-transparent hover:bg-slate-50 hover:border-slate-100'
                          }`}
                        >
                          <div 
                            className="px-3 py-2 cursor-pointer"
                            onClick={() => setSelectedJobId(job.id)}
                          >
                            <div className="flex justify-between items-start mb-1">
                              <span className={`text-sm font-medium truncate w-32 ${
                                isSelected ? 'text-primary' : !isActive ? 'text-slate-500 line-through' : isUnassigned ? 'text-orange-800' : 'text-slate-700'
                              }`}>
                                {job.title}
                              </span>
                              
                              {/* Status Dropdown Trigger */}
                              <div className="relative" onClick={(e) => e.stopPropagation()}>
                                <div className="p-1 rounded hover:bg-slate-200 cursor-pointer text-slate-400">
                                   <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1"></circle><circle cx="12" cy="5" r="1"></circle><circle cx="12" cy="19" r="1"></circle></svg>
                                </div>
                                <select
                                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                                  value={job.status}
                                  onChange={(e) => onUpdateJobStatus(job.id, e.target.value as Job['status'])}
                                  title="Change Project Status"
                                >
                                  <option value="Active">Active</option>
                                  <option value="Suspended">Suspended</option>
                                  <option value="Expired">Expired</option>
                                  <option value="Closed">Closed</option>
                                </select>
                              </div>
                            </div>

                            {/* Additional Info: Created Date & Count */}
                            <div className="flex justify-between items-center text-[10px] text-slate-400 mb-2">
                               <span>Created: {formatDate(job.createdAt)}</span>
                               <span className={`px-1.5 rounded-full ${
                                isSelected ? 'bg-blue-200 text-blue-700' : 
                                'bg-slate-200 text-slate-500'
                              }`}>
                                {candidates.filter(c => c.jobId === job.id).length}
                              </span>
                            </div>
                            
                            <div className={`flex items-center justify-between pt-2 border-t border-dashed ${
                              isUnassigned ? 'border-orange-200' : 'border-slate-100'
                            }`}>
                              <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                                  <span className={`text-[10px] ${isUnassigned ? 'text-orange-600 font-medium' : 'text-slate-400'}`}>
                                    {isUnassigned ? 'Unassigned' : 'Owner:'}
                                  </span>
                                  <div className="relative group">
                                    <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[8px] cursor-pointer ${
                                      assignee?.color || (isUnassigned ? 'bg-orange-200 text-orange-700' : 'bg-slate-200')
                                    }`}>
                                      {assignee?.avatar || '!'}
                                    </div>
                                    <select 
                                      className="absolute inset-0 opacity-0 cursor-pointer"
                                      value={job.assigneeId || ''}
                                      onChange={(e) => onAssignJob(job.id, e.target.value)}
                                    >
                                      <option value="">Unassigned</option>
                                      {users.map(u => (
                                        <option key={u.id} value={u.id}>{u.name}</option>
                                      ))}
                                    </select>
                                  </div>
                              </div>
                              {/* Status Indicator Dot */}
                              <div className="flex items-center gap-1">
                                  <span className={`w-1.5 h-1.5 rounded-full ${
                                      job.status === 'Active' ? 'bg-green-400' :
                                      job.status === 'Suspended' ? 'bg-yellow-400' :
                                      job.status === 'Expired' ? 'bg-red-400' : 'bg-slate-300'
                                  }`}></span>
                                  <span className="text-[9px] text-slate-400">{job.status}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
          
          {/* Export Button in Sidebar */}
          <div className="p-3 bg-slate-50 border-t border-slate-200">
            <button 
              onClick={handleExportCSV}
              className="w-full flex items-center justify-center gap-2 text-sm text-slate-600 font-medium py-2 rounded-lg border border-slate-300 hover:bg-white transition-all shadow-sm"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
              Export to CSV
            </button>
          </div>
        </div>

        {/* RIGHT MAIN: Kanban Board */}
        <div className="flex-1 flex flex-col min-w-0">
          
          {/* Board Header */}
          <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 mb-4 flex justify-between items-center">
            {selectedJob ? (
              <div className="flex-1">
                <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  {selectedJob.title}
                  <span className={`text-xs px-2 py-0.5 rounded-full border ${
                      selectedJob.status === 'Active' ? 'bg-green-50 text-green-700 border-green-200' : 
                      selectedJob.status === 'Suspended' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                      selectedJob.status === 'Expired' ? 'bg-red-50 text-red-700 border-red-200' :
                      'bg-slate-100 text-slate-500'
                  }`}>
                    {selectedJob.status}
                  </span>
                </h2>
                <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                  <span>{clients.find(c => c.id === selectedJob.clientId)?.name}</span>
                  <span>•</span>
                  <span>Created: {formatDate(selectedJob.createdAt)}</span>
                  <span>•</span>
                  <span className={!selectedJob.assigneeId ? 'text-orange-600 font-medium' : ''}>
                    Project Owner: {getUser(selectedJob.assigneeId)?.name || 'Unassigned'}
                  </span>
                </div>
              </div>
            ) : (
              <div className="text-slate-500 italic">Select a project...</div>
            )}
            
            <div className="flex gap-4 text-sm">
                <div className="flex -space-x-2">
                  {users.map(u => (
                    <div key={u.id} className={`w-8 h-8 rounded-full border-2 border-white flex items-center justify-center text-xs ${u.color}`} title={u.name}>
                      {u.avatar}
                    </div>
                  ))}
                </div>
            </div>
          </div>

          {/* Board Columns */}
          {selectedJob ? (
            <div className="flex-1 overflow-x-auto pb-2">
              <div className="flex gap-4 min-w-max h-full">
                {STAGES.map((stage) => {
                  const stageCandidates = activeCandidates.filter(c => c.stage === stage);
                  
                  return (
                    <div key={stage} className="w-72 flex flex-col h-full rounded-xl bg-slate-100/50 border border-slate-200/60">
                      <div className={`p-3 border-b border-slate-200/60 rounded-t-xl flex justify-between items-center ${
                        stage === 'Hired' ? 'bg-green-50/50' : 
                        stage === 'Analyzed' ? 'bg-purple-50/50' : 'bg-slate-100'
                      }`}>
                        <h3 className="font-semibold text-slate-700 text-xs uppercase tracking-wide">{stage}</h3>
                        <span className="bg-white px-1.5 py-0.5 rounded text-[10px] font-bold text-slate-500 shadow-sm border border-slate-100">
                          {stageCandidates.length}
                        </span>
                      </div>
                      
                      <div className="p-2 flex-1 overflow-y-auto space-y-2">
                        {stageCandidates.map((candidate) => {
                          const candidateAssignee = getUser(candidate.assigneeId);
                          const isAI = candidateAssignee?.role === 'AI';

                          return (
                            <div 
                              key={candidate.id} 
                              onClick={() => setSelectedCandidate(candidate)}
                              className={`bg-white p-3 rounded-lg shadow-sm border transition-all group cursor-pointer ${isAI ? 'border-purple-200 shadow-purple-100' : 'border-slate-200 hover:shadow-md hover:border-slate-300'}`}
                            >
                              <div className="flex justify-between items-start mb-1.5">
                                <h4 className="font-bold text-slate-800 text-sm">{candidate.name}</h4>
                                {isAI && (
                                  <span className="bg-purple-100 text-purple-700 text-[9px] px-1 rounded font-bold uppercase tracking-wide border border-purple-200">
                                    AI Task
                                  </span>
                                )}
                              </div>
                              
                              <p className="text-xs text-slate-500 mb-2">{candidate.company}</p>
                              
                              <div className="flex items-center gap-1 mb-3">
                                <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                                  candidate.matchScore >= 90 ? 'bg-green-100 text-green-700' : 
                                  candidate.matchScore >= 75 ? 'bg-yellow-100 text-yellow-700' : 'bg-slate-100 text-slate-600'
                                }`}>
                                  {candidate.matchScore}% Match
                                </span>
                              </div>

                              {/* Controls: Stage, Assignee & Notes */}
                              <div className="pt-2 border-t border-slate-50 space-y-2" onClick={(e) => e.stopPropagation()}>
                                <div className="flex justify-between items-center gap-2">
                                  {/* Stage Selector */}
                                  <select
                                    className="flex-1 text-[10px] border border-slate-200 bg-slate-50 text-slate-600 focus:ring-0 cursor-pointer rounded hover:bg-slate-100 p-1"
                                    value={candidate.stage}
                                    onChange={(e) => onMoveCandidate(candidate.id, e.target.value as Stage)}
                                  >
                                    {STAGES.map(s => (
                                      <option key={s} value={s}>{s}</option>
                                    ))}
                                  </select>

                                  {/* Assignee Selector */}
                                  <div className="relative" title={`Assigned to: ${candidateAssignee?.name || 'Unassigned'}`}>
                                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] cursor-pointer ring-1 ring-white shadow-sm ${candidateAssignee?.color || 'bg-slate-200 text-slate-400'}`}>
                                      {candidateAssignee?.avatar || '?'}
                                    </div>
                                    <select
                                      className="absolute inset-0 opacity-0 cursor-pointer"
                                      value={candidate.assigneeId || ''}
                                      onChange={(e) => onAssignCandidate(candidate.id, e.target.value)}
                                    >
                                      <option value="">Unassigned</option>
                                      {users.map(u => (
                                        <option key={u.id} value={u.id}>
                                          {u.name} {u.role === 'AI' ? '✨' : ''}
                                        </option>
                                      ))}
                                    </select>
                                  </div>
                                </div>

                                {/* Notes Section */}
                                <div className="relative">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setShowNotesDropdown(showNotesDropdown === candidate.id ? null : candidate.id);
                                      setNewNote('');
                                    }}
                                    className="w-full text-[10px] border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 cursor-pointer rounded p-1 flex items-center justify-between"
                                  >
                                    <span className="flex items-center gap-1">
                                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                                      Notes {candidate.notes && candidate.notes.length > 0 ? `(${candidate.notes.length})` : ''}
                                    </span>
                                    <svg className={`transform transition-transform ${showNotesDropdown === candidate.id ? 'rotate-180' : ''}`} xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                                  </button>

                                  {/* Notes Dropdown */}
                                  {showNotesDropdown === candidate.id && (
                                    <div className="absolute bottom-full mb-1 left-0 w-full bg-white border border-slate-200 rounded-lg shadow-lg z-50 max-h-48 overflow-y-auto">
                                      {/* Add Note Form */}
                                      <div className="p-2 border-b border-slate-100 bg-slate-50">
                                        <textarea
                                          className="w-full text-xs p-2 border border-slate-200 rounded focus:ring-1 focus:ring-blue-200 focus:border-blue-300 resize-none"
                                          placeholder={`Add note for ${candidate.stage} stage...`}
                                          rows={2}
                                          value={newNote}
                                          onChange={(e) => setNewNote(e.target.value)}
                                          onClick={(e) => e.stopPropagation()}
                                        />
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            if (newNote.trim()) {
                                              onAddNote(candidate.id, newNote, candidate.stage);
                                              setNewNote('');
                                            }
                                          }}
                                          disabled={!newNote.trim()}
                                          className="mt-1 w-full text-[10px] bg-blue-600 text-white py-1 rounded hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed"
                                        >
                                          Add Note
                                        </button>
                                      </div>

                                      {/* Notes History */}
                                      <div className="p-2 space-y-2">
                                        {candidate.notes && candidate.notes.length > 0 ? (
                                          candidate.notes.slice().reverse().map((note, idx) => (
                                            <div key={idx} className="text-xs bg-slate-50 p-2 rounded border border-slate-100">
                                              <div className="flex justify-between items-start mb-1">
                                                <span className="font-semibold text-slate-700 text-[10px]">{note.author}</span>
                                                <span className="text-[9px] text-slate-400">{new Date(note.timestamp).toLocaleDateString()}</span>
                                              </div>
                                              <div className="text-[10px] px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded inline-block mb-1">
                                                {note.stage}
                                              </div>
                                              <p className="text-slate-600 text-[11px]">{note.note}</p>
                                            </div>
                                          ))
                                        ) : (
                                          <p className="text-[10px] text-slate-400 text-center py-2">No notes yet</p>
                                        )}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                        
                        {stageCandidates.length === 0 && (
                          <div className="h-20 flex flex-col items-center justify-center text-slate-400 opacity-30 border-2 border-dashed border-slate-200 rounded-lg m-1">
                            <span className="text-[10px]">Empty</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-slate-400">
              <div className="text-center">
                <svg className="mx-auto mb-4 text-slate-300" xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="9" y1="21" x2="9" y2="9"></line></svg>
                <p>Select a project from the left sidebar to view the board</p>
                {filterActiveOnly && (
                    <p className="text-xs mt-2 text-slate-400">(Only active projects are shown)</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* AI Analyze Button - Bottom Footer */}
      {selectedJobId && (
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-10">
           <button 
             onClick={handleAIAnalyze}
             disabled={isAnalyzing}
             className={`flex items-center gap-2 px-6 py-3 rounded-full font-bold shadow-xl transition-all ${
               isAnalyzing 
                 ? 'bg-slate-800 text-slate-300 cursor-wait'
                 : 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:scale-105 hover:shadow-indigo-500/40'
             }`}
           >
             {isAnalyzing ? (
               <>
                 <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                 Analyzing Candidates...
               </>
             ) : (
               <>
                 <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a10 10 0 1 0 10 10 4 4 0 0 1-5-5 4 4 0 0 1-5-5"></path><path d="M8.5 8.5v.01"></path><path d="M16 16v.01"></path><path d="M12 12v.01"></path></svg>
                 AI Analyze
               </>
             )}
           </button>
        </div>
      )}

      {/* Candidate Detail Modal */}
      {selectedCandidate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white w-full max-w-2xl max-h-[90vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-slideUp">
             {/* Modal Header */}
             <div className="p-6 border-b border-slate-100 flex justify-between items-start bg-slate-50/50">
               <div className="flex gap-4">
                 {renderAvatar(selectedCandidate.name, selectedCandidate.imageUrl)}
                 <div>
                   <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                     {selectedCandidate.linkedinUrl ? (
                         <a href={selectedCandidate.linkedinUrl} target="_blank" rel="noreferrer" className="hover:text-primary hover:underline flex items-center gap-1">
                           {selectedCandidate.name}
                           <svg className="w-4 h-4 text-blue-500" fill="currentColor" viewBox="0 0 24 24"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/></svg>
                         </a>
                     ) : (
                       selectedCandidate.name
                     )}
                   </h2>
                   <div className="text-slate-500 font-medium">
                     {selectedCandidate.role} at {selectedCandidate.company}
                   </div>
                 </div>
               </div>
               
               <div className="flex flex-col items-end gap-2">
                 <button onClick={handleCloseModal} className="text-slate-400 hover:text-slate-600 transition-colors">
                   <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                 </button>
                 <div className="flex items-center gap-2">
                    <span className={`text-xl font-bold ${
                        selectedCandidate.matchScore >= 90 ? 'text-green-600' : 
                        selectedCandidate.matchScore >= 75 ? 'text-yellow-600' : 'text-slate-400'
                    }`}>
                        {selectedCandidate.matchScore}
                    </span>
                    <span className="text-xs uppercase font-bold text-slate-400">Score</span>
                 </div>
               </div>
             </div>

             {/* Modal Body */}
             <div className="flex-1 overflow-y-auto p-6 space-y-6">
                
                {/* Fit Level Badge & Source */}
                <div className="flex gap-3">
                   {selectedCandidate.fitLevel && (
                     <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide border ${
                       selectedCandidate.fitLevel.toLowerCase() === 'strong' ? 'bg-green-100 text-green-700 border-green-200' :
                       selectedCandidate.fitLevel.toLowerCase() === 'maybe' ? 'bg-yellow-100 text-yellow-700 border-yellow-200' :
                       'bg-slate-100 text-slate-600 border-slate-200'
                     }`}>
                       {selectedCandidate.fitLevel} Fit
                     </span>
                   )}
                   <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide bg-slate-100 text-slate-500 border border-slate-200">
                      Source: {selectedCandidate.source || 'Unknown'}
                   </span>
                   <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide bg-blue-50 text-blue-600 border border-blue-100">
                      Stage: {selectedCandidate.stage}
                   </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-3">AI Analysis</h4>
                        
                        {selectedCandidate.strengths && (
                          <div className="mb-4">
                            <span className="text-xs font-semibold text-green-700 block mb-2">Strengths</span>
                            <ul className="space-y-1.5">
                              {selectedCandidate.strengths.split('|').map((s, i) => (
                                <li key={i} className="text-sm text-slate-700 flex items-start gap-2 bg-green-50/50 p-2 rounded-lg border border-green-100">
                                  <svg className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                                  {s.trim()}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {selectedCandidate.concerns && (
                          <div>
                            <span className="text-xs font-semibold text-orange-700 block mb-2">Concerns / Gaps</span>
                            <ul className="space-y-1.5">
                              {selectedCandidate.concerns.split('|').map((s, i) => (
                                <li key={i} className="text-sm text-slate-700 flex items-start gap-2 bg-orange-50/50 p-2 rounded-lg border border-orange-100">
                                  <svg className="w-4 h-4 text-orange-500 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                                  {s.trim()}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                    </div>

                    <div>
                        <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-3">Profile Summary</h4>
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-sm text-slate-700 leading-relaxed whitespace-pre-wrap h-full">
                           {selectedCandidate.summary || 'No summary available.'}
                        </div>
                    </div>
                </div>
             </div>

             {/* Modal Footer */}
             <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-between items-center">
                <button 
                  onClick={handleDeleteFromModal}
                  className="px-4 py-2 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 hover:text-red-700 transition-colors flex items-center gap-2"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
                  Delete Candidate
                </button>
                <button 
                  onClick={handleCloseModal}
                  className="px-6 py-2 bg-white border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors shadow-sm"
                >
                  Close
                </button>
             </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default KanbanTab;