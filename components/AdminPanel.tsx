
import React, { useState, useEffect } from 'react';
import { api } from '../services/apiService';
import { AuditLog, SystemStats, SystemConfig, Candidate, Job, User } from '../types';

interface AdminPanelProps {
  allowedEmails: string[];
  onAddEmail: (email: string) => Promise<void>;
  onRemoveEmail: (email: string) => Promise<void>;
  onUpdateConfig: (config: SystemConfig) => Promise<void>;
  currentConfig?: SystemConfig;
  candidates?: Candidate[];
  jobs?: Job[];
  users?: User[];
}

const AdminPanel: React.FC<AdminPanelProps> = ({ allowedEmails, onAddEmail, onRemoveEmail, onUpdateConfig, currentConfig, candidates = [], jobs = [], users = [] }) => {
  const [activeSubTab, setActiveSubTab] = useState<'dashboard' | 'integrations' | 'security' | 'logs' | 'reports'>('dashboard');
  
  // Data State
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Integration Config State
  const [configForm, setConfigForm] = useState<SystemConfig>({
      linkedinApiUrl: '',
      jobAlertsApiUrl: '',
      googleSearchEnabled: true
  });
  
  // Security State
  const [newEmail, setNewEmail] = useState('');

  // Initial Data Load
  useEffect(() => {
    if (currentConfig) {
        setConfigForm(currentConfig);
    }
    loadStats();
  }, [currentConfig]);

  // Tab Switching Logic
  useEffect(() => {
    if (activeSubTab === 'logs') loadLogs();
    if (activeSubTab === 'dashboard') loadStats();
  }, [activeSubTab]);

  const loadStats = async () => {
    setLoading(true);
    try {
        const s = await api.fetchSystemStats();
        setStats(s);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const loadLogs = async () => {
    setLoading(true);
    try {
        const l = await api.fetchAuditLogs();
        setLogs(l);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const handleSaveConfig = async () => {
      setLoading(true);
      try {
          await onUpdateConfig(configForm);
      } catch (e) { alert("Failed to save configuration"); }
      setLoading(false);
  };

  const handleAddEmail = async () => {
      if (!newEmail) return;
      await onAddEmail(newEmail);
      setNewEmail('');
  };

  const handleFactoryReset = () => {
      if (window.confirm("This will clear all local data and reload the app. Are you sure?")) {
          localStorage.clear();
          window.location.reload();
      }
  };

  const renderDashboard = () => (
    <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-fadeIn">
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <h4 className="text-slate-500 text-sm font-medium uppercase">Total Candidates</h4>
                <div className="text-3xl font-bold text-slate-800 mt-2">{stats?.totalCandidates || 0}</div>
            </div>
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <h4 className="text-slate-500 text-sm font-medium uppercase">Active Jobs</h4>
                <div className="text-3xl font-bold text-green-600 mt-2">{stats?.activeJobs || 0}</div>
                <div className="text-xs text-slate-400 mt-1">out of {stats?.totalJobs} total</div>
            </div>
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <h4 className="text-slate-500 text-sm font-medium uppercase">Clients Managed</h4>
                <div className="text-3xl font-bold text-blue-600 mt-2">{stats?.totalClients || 0}</div>
            </div>
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <h4 className="text-slate-500 text-sm font-medium uppercase">API Calls (24h)</h4>
                <div className="text-3xl font-bold text-purple-600 mt-2">{stats?.apiCallsLast24h || 0}</div>
                <div className="text-xs text-slate-400 mt-1">Security & Integration Events</div>
            </div>
        </div>

        {/* Troubleshooting Section */}
        <div className="bg-red-50 border border-red-100 rounded-xl p-6">
            <h4 className="text-red-800 font-bold mb-2 flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
                Troubleshooting Area
            </h4>
            <p className="text-sm text-red-600 mb-4">If the application is behaving unexpectedly or not loading data, try resetting the local cache.</p>
            <button 
                onClick={handleFactoryReset}
                className="px-4 py-2 bg-white border border-red-200 text-red-600 font-medium rounded-lg hover:bg-red-100 transition-colors shadow-sm"
            >
                Reset App Data & Reload
            </button>
        </div>
    </div>
  );

  const renderIntegrations = () => (
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden max-w-3xl animate-fadeIn">
          <div className="p-6 border-b border-slate-100 bg-slate-50">
              <h3 className="text-lg font-bold text-slate-800">API Integration Settings</h3>
              <p className="text-sm text-slate-500">Manage external webhook URLs and service connections.</p>
          </div>
          <div className="p-6 space-y-6">
              <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">LinkedIn Scraper Webhook URL (N8N)</label>
                  <input 
                    type="text" 
                    value={configForm.linkedinApiUrl}
                    onChange={(e) => setConfigForm({...configForm, linkedinApiUrl: e.target.value})}
                    className="w-full p-2 border border-slate-300 rounded-lg text-sm font-mono text-slate-600 focus:ring-2 focus:ring-blue-500"
                    placeholder="https://n8n..."
                  />
                  <p className="text-xs text-slate-400 mt-1">Endpoint used for 'Search LinkedIn' feature.</p>
              </div>
              
              <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Job Alerts Webhook URL (N8N)</label>
                  <input 
                    type="text" 
                    value={configForm.jobAlertsApiUrl}
                    onChange={(e) => setConfigForm({...configForm, jobAlertsApiUrl: e.target.value})}
                    className="w-full p-2 border border-slate-300 rounded-lg text-sm font-mono text-slate-600 focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-xs text-slate-400 mt-1">Endpoint used to fetch real-time market job alerts.</p>
              </div>

              <div className="flex items-center gap-2">
                  <input 
                    type="checkbox" 
                    id="gsEnabled"
                    checked={configForm.googleSearchEnabled}
                    onChange={(e) => setConfigForm({...configForm, googleSearchEnabled: e.target.checked})}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <label htmlFor="gsEnabled" className="text-sm text-slate-700 font-medium">Enable Google Search Grounding</label>
              </div>
          </div>
          <div className="p-6 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button 
                onClick={handleSaveConfig}
                disabled={loading}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                  {loading ? 'Saving...' : 'Save Configuration'}
              </button>
          </div>
      </div>
  );

  const renderSecurity = () => (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fadeIn">
        <div className="lg:col-span-1 bg-white rounded-xl border border-slate-200 shadow-sm p-6">
             <h3 className="font-bold text-slate-800 mb-4">Add Authorized User</h3>
             <div className="space-y-3">
                 <input 
                   type="email" 
                   value={newEmail}
                   onChange={(e) => setNewEmail(e.target.value)}
                   className="w-full p-2 border border-slate-300 rounded-lg text-sm"
                   placeholder="user@company.com"
                 />
                 <button 
                   onClick={handleAddEmail}
                   className="w-full py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700"
                 >
                     Grant Access
                 </button>
             </div>
             <div className="mt-6 pt-6 border-t border-slate-100">
                 <h4 className="font-bold text-slate-800 mb-2 text-sm">Access Policy</h4>
                 <p className="text-xs text-slate-500 leading-relaxed">
                     Users must log in with a Google Account matching an email in the allowed list. 
                     Admins have full access to this dashboard. Standard users only see the Recruitment Dashboard.
                 </p>
             </div>
        </div>

        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
             <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                 <h3 className="font-bold text-slate-800">Allowed Users</h3>
                 <span className="bg-slate-200 text-slate-600 text-xs px-2 py-1 rounded-full">{allowedEmails.length} Users</span>
             </div>
             <div className="divide-y divide-slate-100 max-h-[500px] overflow-y-auto">
                 {allowedEmails.map(email => (
                     <div key={email} className="p-4 flex justify-between items-center hover:bg-slate-50 transition-colors">
                         <div className="flex items-center gap-3">
                             <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-500">
                                 {email[0].toUpperCase()}
                             </div>
                             <span className="text-sm font-medium text-slate-700">{email}</span>
                         </div>
                         <button 
                           onClick={() => onRemoveEmail(email)}
                           className="text-red-500 hover:text-red-700 text-xs font-medium px-2 py-1 rounded border border-transparent hover:border-red-200 hover:bg-red-50"
                         >
                             Revoke
                         </button>
                     </div>
                 ))}
             </div>
        </div>
    </div>
  );

  const renderLogs = () => (
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden animate-fadeIn">
          <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
              <h3 className="font-bold text-slate-800">System Audit Logs</h3>
              <button onClick={loadLogs} className="text-xs text-blue-600 hover:underline">Refresh</button>
          </div>
          <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
                      <tr>
                          <th className="px-4 py-3">Time</th>
                          <th className="px-4 py-3">Actor</th>
                          <th className="px-4 py-3">Event</th>
                          <th className="px-4 py-3">Resource</th>
                          <th className="px-4 py-3">Details</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                      {logs.length === 0 ? (
                          <tr><td colSpan={5} className="p-8 text-center text-slate-400">No logs found</td></tr>
                      ) : (
                          logs.map(log => (
                              <tr key={log.id} className="hover:bg-slate-50">
                                  <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                                      {new Date(log.created_at).toLocaleString()}
                                  </td>
                                  <td className="px-4 py-3 font-medium text-slate-700">{log.actor_email}</td>
                                  <td className="px-4 py-3">
                                      <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-xs border border-slate-200 font-mono">
                                          {log.event_type}
                                      </span>
                                  </td>
                                  <td className="px-4 py-3 text-slate-600">{log.resource_type} {log.resource_id ? `#${log.resource_id.substring(0,4)}` : ''}</td>
                                  <td className="px-4 py-3 text-slate-500 font-mono text-xs truncate max-w-xs">
                                      {JSON.stringify(log.payload)}
                                  </td>
                              </tr>
                          ))
                      )}
                  </tbody>
              </table>
          </div>
      </div>
  );

  const renderReports = () => {
    // Calculate team-wide metrics
    const totalCandidates = candidates.length;
    const totalJobs = jobs.length;
    const activeJobs = jobs.filter(j => j.status === 'Active').length;
    const hiredCount = candidates.filter(c => c.stage === 'Hired').length;
    const avgMatchScore = candidates.length > 0
      ? Math.round(candidates.reduce((sum, c) => sum + c.matchScore, 0) / candidates.length)
      : 0;

    // Calculate per-recruiter metrics (exclude AI)
    const recruiters = users.filter(u => u.role !== 'AI');
    const recruiterStats = recruiters.map(user => {
      const userCandidates = candidates.filter(c => c.assigneeId === user.id);
      const userJobs = jobs.filter(j => j.assigneeId === user.id);
      const userActiveJobs = userJobs.filter(j => j.status === 'Active');
      const userHired = userCandidates.filter(c => c.stage === 'Hired').length;
      const userAvgScore = userCandidates.length > 0
        ? Math.round(userCandidates.reduce((sum, c) => sum + c.matchScore, 0) / userCandidates.length)
        : 0;

      // Stage distribution
      const stageDistribution = {
        'Identified': userCandidates.filter(c => c.stage === 'Identified').length,
        'Analyzed': userCandidates.filter(c => c.stage === 'Analyzed').length,
        'Contacted': userCandidates.filter(c => c.stage === 'Contacted').length,
        'Screening': userCandidates.filter(c => c.stage === 'Screening').length,
        'Interview': userCandidates.filter(c => c.stage === 'Interview').length,
        'Offer': userCandidates.filter(c => c.stage === 'Offer').length,
        'Hired': userHired,
        'Rejected': userCandidates.filter(c => c.stage === 'Rejected').length,
      };

      return {
        user,
        totalCandidates: userCandidates.length,
        activeJobs: userActiveJobs.length,
        hired: userHired,
        avgMatchScore: userAvgScore,
        stageDistribution,
        conversionRate: userCandidates.length > 0
          ? Math.round((userHired / userCandidates.length) * 100)
          : 0
      };
    });

    return (
      <div className="space-y-6 animate-fadeIn">
        {/* Team Overview */}
        <div className="bg-gradient-to-br from-purple-600 to-blue-600 text-white p-6 rounded-xl shadow-lg">
          <h3 className="text-xl font-bold mb-4">Team Performance Overview</h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div>
              <div className="text-3xl font-bold">{totalCandidates}</div>
              <div className="text-sm text-purple-100">Total Candidates</div>
            </div>
            <div>
              <div className="text-3xl font-bold">{activeJobs}</div>
              <div className="text-sm text-purple-100">Active Jobs</div>
            </div>
            <div>
              <div className="text-3xl font-bold">{hiredCount}</div>
              <div className="text-sm text-purple-100">Placements</div>
            </div>
            <div>
              <div className="text-3xl font-bold">{avgMatchScore}%</div>
              <div className="text-sm text-purple-100">Avg Match Score</div>
            </div>
            <div>
              <div className="text-3xl font-bold">
                {totalCandidates > 0 ? Math.round((hiredCount / totalCandidates) * 100) : 0}%
              </div>
              <div className="text-sm text-purple-100">Conversion Rate</div>
            </div>
          </div>
        </div>

        {/* Individual Recruiter Performance */}
        <div>
          <h3 className="text-lg font-bold text-slate-800 mb-4">Individual Recruiter Performance</h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {recruiterStats.map(stat => (
              <div key={stat.user.id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                {/* Recruiter Header */}
                <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold ${stat.user.color}`}>
                    {stat.user.avatar}
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800">{stat.user.name}</h4>
                    <p className="text-xs text-slate-500">{stat.user.role}</p>
                  </div>
                </div>

                {/* Key Metrics */}
                <div className="p-4 grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-2xl font-bold text-slate-800">{stat.totalCandidates}</div>
                    <div className="text-xs text-slate-500">Total Candidates</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-green-600">{stat.hired}</div>
                    <div className="text-xs text-slate-500">Placements</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-blue-600">{stat.activeJobs}</div>
                    <div className="text-xs text-slate-500">Active Jobs</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-purple-600">{stat.avgMatchScore}%</div>
                    <div className="text-xs text-slate-500">Avg Match</div>
                  </div>
                </div>

                {/* Conversion Rate Bar */}
                <div className="px-4 pb-4">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs font-medium text-slate-600">Conversion Rate</span>
                    <span className="text-xs font-bold text-slate-800">{stat.conversionRate}%</span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-green-500 to-emerald-600 h-full rounded-full transition-all duration-500"
                      style={{ width: `${stat.conversionRate}%` }}
                    />
                  </div>
                </div>

                {/* Stage Distribution */}
                <div className="p-4 border-t border-slate-100">
                  <h5 className="text-xs font-bold text-slate-600 mb-3 uppercase">Pipeline Distribution</h5>
                  <div className="space-y-2">
                    {Object.entries(stat.stageDistribution).map(([stage, count]) => {
                      const percentage = stat.totalCandidates > 0
                        ? Math.round((count / stat.totalCandidates) * 100)
                        : 0;
                      const stageColors: Record<string, string> = {
                        'Identified': 'bg-slate-400',
                        'Analyzed': 'bg-blue-400',
                        'Contacted': 'bg-cyan-400',
                        'Screening': 'bg-yellow-400',
                        'Interview': 'bg-orange-400',
                        'Offer': 'bg-purple-400',
                        'Hired': 'bg-green-500',
                        'Rejected': 'bg-red-400'
                      };
                      return count > 0 ? (
                        <div key={stage} className="flex items-center gap-2">
                          <div className={`w-3 h-3 rounded-full ${stageColors[stage]}`}></div>
                          <span className="text-xs text-slate-600 flex-1">{stage}</span>
                          <span className="text-xs font-bold text-slate-700">{count}</span>
                          <span className="text-xs text-slate-400 w-10 text-right">{percentage}%</span>
                        </div>
                      ) : null;
                    })}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {recruiterStats.length === 0 && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-8 text-center">
              <p className="text-slate-500">No recruiter performance data available yet.</p>
              <p className="text-sm text-slate-400 mt-2">Start assigning candidates to team members to see performance metrics.</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full space-y-6">
        {/* Admin Header */}
        <div className="bg-slate-800 text-white p-6 rounded-xl shadow-md flex justify-between items-center">
            <div>
                <h2 className="text-2xl font-bold">Admin Dashboard</h2>
                <p className="text-slate-400 text-sm">System configuration, security monitoring, and integration management.</p>
            </div>
            <div className="flex bg-slate-700/50 p-1 rounded-lg">
                {(['dashboard', 'reports', 'integrations', 'security', 'logs'] as const).map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActiveSubTab(tab)}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                            activeSubTab === tab ? 'bg-slate-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
                        }`}
                    >
                        {tab.charAt(0).toUpperCase() + tab.slice(1)}
                    </button>
                ))}
            </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 min-h-0">
            {activeSubTab === 'dashboard' && renderDashboard()}
            {activeSubTab === 'reports' && renderReports()}
            {activeSubTab === 'integrations' && renderIntegrations()}
            {activeSubTab === 'security' && renderSecurity()}
            {activeSubTab === 'logs' && renderLogs()}
        </div>
    </div>
  );
};

export default AdminPanel;
