
import React, { useState, useEffect } from 'react';
import { Candidate, Stage, Client, Job, User, SystemConfig } from './types';
import SearchTab from './components/SearchTab';
import KanbanTab from './components/KanbanTab';
import IntelligenceTab from './components/IntelligenceTab';
import AdminPanel from './components/AdminPanel';
import { getMockDataSync, api } from './services/apiService';
import { setIntegrationConfig } from './services/geminiService';
import { v4 as uuidv4 } from 'uuid';

type Tab = 'search' | 'kanban' | 'intelligence' | 'admin';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('search');
  
  // Default Data State (starts with Mock, updates from API)
  const initialData = getMockDataSync();
  const [clients, setClients] = useState<Client[]>(initialData.clients);
  const [jobs, setJobs] = useState<Job[]>(initialData.jobs);
  const [candidates, setCandidates] = useState<Candidate[]>(initialData.candidates);
  const [users, setUsers] = useState<User[]>(initialData.users);
  const [allowedEmails, setAllowedEmails] = useState<string[]>(initialData.allowedEmails || []);
  const [systemConfig, setSystemConfig] = useState<SystemConfig>(initialData.config || { linkedinApiUrl: '', jobAlertsApiUrl: '', googleSearchEnabled: true });
  const currentUser = initialData.users[0];

  // --- INITIAL DATA FETCH ---
  useEffect(() => {
    // Set dev token if not already set (for development/demo mode)
    if (!localStorage.getItem('authToken')) {
      localStorage.setItem('authToken', 'DEV_TOKEN_REASONEX');
    }

    const loadData = async () => {
      try {
        const data = await api.fetchInitialData();
        setClients(data.clients);
        setJobs(data.jobs);
        setCandidates(data.candidates);
        setUsers(data.users);

        // If backend has config, update geminiService integration URLs
        if (data.config) {
          setSystemConfig(data.config);
          setIntegrationConfig({
            linkedinApiUrl: data.config.linkedinApiUrl,
            jobAlertsApiUrl: data.config.jobAlertsApiUrl
          });
        }
      } catch (e) {
        console.warn("Using offline/mock data");
        // Set default integration config from initial mock data
        setIntegrationConfig({
          linkedinApiUrl: systemConfig.linkedinApiUrl,
          jobAlertsApiUrl: systemConfig.jobAlertsApiUrl
        });
      }
    };
    loadData();
  }, []);

  // --- ACTIONS ---

  const handleCreateJobAndAddCandidates = async (clientName: string, jobTitle: string, jdText: string, newCandidates: Partial<Candidate>[], assigneeId?: string) => {
    // 1. Handle Client
    let client = clients.find(c => c.name.toLowerCase() === clientName.toLowerCase());
    if (!client) {
      client = { id: uuidv4(), name: clientName, industry: 'Technology' }; 
      setClients(prev => [...prev, client!]);
      await api.upsertClient(client);
    }

    // 2. Handle Job
    let job = jobs.find(j => j.clientId === client!.id && j.title.toLowerCase() === jobTitle.toLowerCase());
    if (!job) {
      job = { 
        id: uuidv4(), 
        clientId: client.id, 
        assigneeId: assigneeId || currentUser?.id,
        title: jobTitle, 
        description: jdText, 
        status: 'Active', 
        createdAt: new Date().toISOString() 
      };
      setJobs(prev => [...prev, job!]);
      await api.upsertJob(job);
    }

    // 3. Handle Candidates
    const formattedCandidates: Candidate[] = newCandidates.map(c => ({
      ...c,
      id: uuidv4(),
      jobId: job!.id,
      assigneeId: assigneeId || currentUser?.id, 
      stage: 'Identified',
      addedAt: new Date().toISOString(),
      matchScore: c.matchScore || 50,
      name: c.name || 'Unknown',
      role: c.role || 'Unknown',
      company: c.company || 'Unknown',
      email: c.email || '',
    } as Candidate));

    setCandidates(prev => [...prev, ...formattedCandidates]);
    
    // Save all candidates to backend
    formattedCandidates.forEach(c => api.upsertCandidate(c));

    setActiveTab('kanban');
  };

  const handleMoveCandidate = (id: string, newStage: Stage) => {
    setCandidates(prev => prev.map(c => {
      if (c.id === id) {
        const updated = { ...c, stage: newStage };
        api.upsertCandidate(updated); // Sync to DB
        return updated;
      }
      return c;
    }));
  };

  const handleAssignCandidate = (candidateId: string, userId: string) => {
    setCandidates(prev => prev.map(c => {
      if (c.id === candidateId) {
        const updated = { ...c, assigneeId: userId };
        api.upsertCandidate(updated); // Sync to DB
        return updated;
      }
      return c;
    }));
  };

  const handleAssignJob = (jobId: string, userId: string) => {
    setJobs(prev => prev.map(j => {
      if (j.id === jobId) {
        const updated = { ...j, assigneeId: userId };
        api.upsertJob(updated); // Sync to DB
        return updated;
      }
      return j;
    }));
  };

  const handleUpdateJobStatus = (jobId: string, status: Job['status']) => {
    setJobs(prev => prev.map(j => {
      if (j.id === jobId) {
        const updated = { ...j, status: status };
        api.upsertJob(updated); // Sync to DB
        return updated;
      }
      return j;
    }));
  };

  const handleRemoveCandidate = (candidateId: string) => {
    if (window.confirm("Delete this candidate?")) {
      setCandidates(prev => prev.filter(c => c.id !== candidateId));
      api.deleteCandidate(candidateId); // Sync to DB
    }
  };

  // Admin Panel Actions
  const handleAddEmail = async (email: string) => {
    await api.addAllowedUser(email);
    setAllowedEmails(prev => [...prev, email]);
  };

  const handleRemoveEmail = async (email: string) => {
    await api.removeAllowedUser(email);
    setAllowedEmails(prev => prev.filter(e => e !== email));
  };

  const handleUpdateConfig = async (config: SystemConfig) => {
    await api.updateSystemConfig(config);
    setSystemConfig(config);
    // Update geminiService with new integration URLs
    setIntegrationConfig({
      linkedinApiUrl: config.linkedinApiUrl,
      jobAlertsApiUrl: config.jobAlertsApiUrl
    });
  };

  // --- RENDER ---
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col relative">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <img
                src="/tead-logo.png"
                alt="Tead Logo"
                className="h-10 w-auto"
              />
              <span className="text-xl font-bold text-slate-800 tracking-tight hidden md:inline">Tead <span className="text-purple-700">Headhunter</span></span>
            </div>
            
            <nav className="flex space-x-1 bg-slate-100 p-1 rounded-lg">
              {(['search', 'kanban', 'intelligence', 'admin'] as Tab[]).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-3 md:px-4 py-2 rounded-md text-sm font-medium transition-all ${
                    activeTab === tab
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
                  }`}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </nav>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        {activeTab === 'search' && (
          <SearchTab 
            existingClients={clients} 
            users={users}
            onAddCandidates={handleCreateJobAndAddCandidates} 
          />
        )}
        {activeTab === 'kanban' && (
          <KanbanTab 
            clients={clients} 
            jobs={jobs} 
            candidates={candidates} 
            users={users}
            onMoveCandidate={handleMoveCandidate} 
            onAssignCandidate={handleAssignCandidate}
            onAssignJob={handleAssignJob}
            onUpdateJobStatus={handleUpdateJobStatus}
            onRemoveCandidate={handleRemoveCandidate}
          />
        )}
        {activeTab === 'intelligence' && (
          <IntelligenceTab />
        )}
        {activeTab === 'admin' && (
          <AdminPanel
            allowedEmails={allowedEmails}
            onAddEmail={handleAddEmail}
            onRemoveEmail={handleRemoveEmail}
            onUpdateConfig={handleUpdateConfig}
            currentConfig={systemConfig}
          />
        )}
      </main>
    </div>
  );
};

export default App;
