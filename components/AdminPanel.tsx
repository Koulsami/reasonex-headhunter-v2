
import React, { useState, useEffect } from 'react';
import { api } from '../services/apiService';
import { AuditLog, SystemStats, SystemConfig } from '../types';

interface AdminPanelProps {
  allowedEmails: string[];
  onAddEmail: (email: string) => Promise<void>;
  onRemoveEmail: (email: string) => Promise<void>;
  onUpdateConfig: (config: SystemConfig) => Promise<void>;
  currentConfig?: SystemConfig;
}

const AdminPanel: React.FC<AdminPanelProps> = ({ allowedEmails, onAddEmail, onRemoveEmail, onUpdateConfig, currentConfig }) => {
  const [activeSubTab, setActiveSubTab] = useState<'dashboard' | 'integrations' | 'security' | 'logs'>('dashboard');
  
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

  return (
    <div className="flex flex-col h-full space-y-6">
        {/* Admin Header */}
        <div className="bg-slate-800 text-white p-6 rounded-xl shadow-md flex justify-between items-center">
            <div>
                <h2 className="text-2xl font-bold">Admin Dashboard</h2>
                <p className="text-slate-400 text-sm">System configuration, security monitoring, and integration management.</p>
            </div>
            <div className="flex bg-slate-700/50 p-1 rounded-lg">
                {(['dashboard', 'integrations', 'security', 'logs'] as const).map(tab => (
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
            {activeSubTab === 'integrations' && renderIntegrations()}
            {activeSubTab === 'security' && renderSecurity()}
            {activeSubTab === 'logs' && renderLogs()}
        </div>
    </div>
  );
};

export default AdminPanel;
