import React, { useState } from 'react';
import { Client, ExperienceLevel, EmploymentType } from '../types';

interface CreateProjectModalProps {
  existingClients: Client[];
  onClose: () => void;
  onCreateProject: (projectData: {
    clientName: string;
    position: string;
    country: string;
    city: string;
    experienceLevel: ExperienceLevel;
    employmentType: EmploymentType;
  }) => void;
}

const CreateProjectModal: React.FC<CreateProjectModalProps> = ({ existingClients, onClose, onCreateProject }) => {
  const [clientName, setClientName] = useState('');
  const [position, setPosition] = useState('');
  const [country, setCountry] = useState('');
  const [city, setCity] = useState('');
  const [experienceLevel, setExperienceLevel] = useState<ExperienceLevel>('Mid Level');
  const [employmentType, setEmploymentType] = useState<EmploymentType>('Full-time');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!clientName.trim()) {
      alert('Please enter a client name');
      return;
    }
    if (!position.trim()) {
      alert('Please enter a position title');
      return;
    }
    if (!country.trim()) {
      alert('Please select a country');
      return;
    }

    onCreateProject({
      clientName: clientName.trim(),
      position: position.trim(),
      country: country.trim(),
      city: city.trim(),
      experienceLevel,
      employmentType
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-fadeIn" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 rounded-t-2xl flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
                <line x1="16" y1="13" x2="8" y2="13"></line>
                <line x1="16" y1="17" x2="8" y2="17"></line>
                <polyline points="10 9 9 9 8 9"></polyline>
              </svg>
              Create New Project
            </h2>
            <p className="text-sm text-slate-500 mt-1">Define a new recruitment project with client and position details</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            title="Close"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Client Name */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Client / Company <span className="text-red-500">*</span>
            </label>
            <input
              list="clients-list"
              type="text"
              className="w-full p-3 border-2 border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-all text-sm"
              placeholder="e.g. Acme Corp, TechStart Inc"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              required
            />
            <datalist id="clients-list">
              {existingClients.map(c => <option key={c.id} value={c.name} />)}
            </datalist>
            <p className="text-xs text-slate-500 mt-1">Select existing client or type a new one</p>
          </div>

          {/* Position Title */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Position / Role <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              className="w-full p-3 border-2 border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-all text-sm"
              placeholder="e.g. Senior React Developer, Product Manager"
              value={position}
              onChange={(e) => setPosition(e.target.value)}
              required
            />
            <p className="text-xs text-slate-500 mt-1">The job title or position name</p>
          </div>

          {/* Location Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Country <span className="text-red-500">*</span>
              </label>
              <select
                className="w-full p-3 border-2 border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-all text-sm"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                required
              >
                <option value="">Select Country</option>
                <option value="United States">United States</option>
                <option value="United Kingdom">United Kingdom</option>
                <option value="Canada">Canada</option>
                <option value="Australia">Australia</option>
                <option value="India">India</option>
                <option value="Singapore">Singapore</option>
                <option value="Germany">Germany</option>
                <option value="France">France</option>
                <option value="Netherlands">Netherlands</option>
                <option value="Switzerland">Switzerland</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                City <span className="text-slate-400">(Optional)</span>
              </label>
              <input
                type="text"
                className="w-full p-3 border-2 border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-all text-sm"
                placeholder="e.g. New York, London, Bangalore"
                value={city}
                onChange={(e) => setCity(e.target.value)}
              />
            </div>
          </div>

          {/* Experience & Employment Type Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Experience Level <span className="text-red-500">*</span>
              </label>
              <select
                className="w-full p-3 border-2 border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-all text-sm"
                value={experienceLevel}
                onChange={(e) => setExperienceLevel(e.target.value as ExperienceLevel)}
                required
              >
                <option value="Entry Level">Entry Level / Junior</option>
                <option value="Mid Level">Mid Level</option>
                <option value="Senior Level">Senior Level</option>
                <option value="Executive">Executive / Leadership</option>
              </select>
              <p className="text-xs text-slate-500 mt-1">Aligned with LinkedIn experience levels</p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Employment Type <span className="text-red-500">*</span>
              </label>
              <select
                className="w-full p-3 border-2 border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-all text-sm"
                value={employmentType}
                onChange={(e) => setEmploymentType(e.target.value as EmploymentType)}
                required
              >
                <option value="Full-time">Full-time</option>
                <option value="Contract">Contract</option>
                <option value="Part-time">Part-time</option>
                <option value="Temporary">Temporary</option>
              </select>
            </div>
          </div>

          {/* Info Box */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex gap-3">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-600 flex-shrink-0 mt-0.5">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="16" x2="12" y2="12"></line>
                <line x1="12" y1="8" x2="12.01" y2="8"></line>
              </svg>
              <div className="text-sm text-blue-800">
                <p className="font-semibold mb-1">What happens next?</p>
                <p>After creating this project, you'll be able to run multiple searches with different job descriptions. All candidates found will be added to this project's pipeline.</p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2.5 rounded-lg font-medium border-2 border-slate-300 text-slate-700 hover:bg-slate-50 transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 rounded-lg font-medium text-white bg-primary hover:bg-blue-700 shadow-lg shadow-blue-500/30 transition-all flex items-center gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
              Create Project
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateProjectModal;
