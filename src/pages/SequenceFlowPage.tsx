import React from 'react';
import { AlertCircle, CheckCircle, Clock, Plus, RefreshCw, Send, Square, CheckSquare, Users, Wand2 } from 'lucide-react';
import { useStore } from '../store/useStore';
import type { Review } from '../types';
import { toTitleCase } from '../utils/stringUtils';
import { AISequenceTemplateGeneratorPage } from './AISequenceTemplateGeneratorPage';
import { SimplifiedSequenceMessagesPage } from './SimplifiedSequenceMessagesPage';
import { WhatsAppStatusIndicator } from '../components/WhatsApp/WhatsAppStatusIndicator';

type SequenceFlowTab = 'lead-entry' | 'assign-sequence' | 'sequence-creator' | 'quick-send';

const LANGUAGE_NAMES: Record<string, string> = {
  en: 'English',
  hi: 'Hindi',
  gu: 'Gujarati',
  mr: 'Marathi',
};

const tabs: Array<{
  id: SequenceFlowTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { id: 'lead-entry', label: 'Lead Entry', icon: Plus },
  { id: 'assign-sequence', label: 'Assign Sequence', icon: Users },
  { id: 'sequence-creator', label: 'Sequence Creator', icon: Wand2 },
  { id: 'quick-send', label: 'Quick Send', icon: Send },
];

export function SequenceFlowPage() {
  const {
    user,
    reviews,
    sequenceTemplates,
    lazyLoadReviews,
    fetchReviews,
    fetchSequenceTemplates,
    fetchSequenceMessages,
    addReview,
    createBulkSequenceMessages,
    isLoadingReviews,
  } = useStore();

  const [activeTab, setActiveTab] = React.useState<SequenceFlowTab>('lead-entry');
  const [leadForm, setLeadForm] = React.useState({
    patientName: '',
    appointmentDate: new Date().toISOString().split('T')[0],
    contactNumber: '',
    treatment: '',
    notes: '',
  });
  const [selectedLeadIds, setSelectedLeadIds] = React.useState<Set<string>>(new Set());
  const [profileType, setProfileType] = React.useState('');
  const [language, setLanguage] = React.useState(user?.defaultLanguage || 'en');
  const [isSavingLead, setIsSavingLead] = React.useState(false);
  const [isAssigning, setIsAssigning] = React.useState(false);
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [successMessage, setSuccessMessage] = React.useState('');
  const [errorMessage, setErrorMessage] = React.useState('');

  React.useEffect(() => {
    if (!user?.id) return;

    lazyLoadReviews();
    fetchSequenceTemplates();
  }, [user?.id, lazyLoadReviews, fetchSequenceTemplates]);

  React.useEffect(() => {
    if (!successMessage && !errorMessage) return;

    const timeout = window.setTimeout(() => {
      setSuccessMessage('');
      setErrorMessage('');
    }, 4500);

    return () => window.clearTimeout(timeout);
  }, [successMessage, errorMessage]);

  const profileTypeOptions = React.useMemo(() => {
    const fromTemplates = sequenceTemplates.map(template => template.profileType).filter(Boolean);
    const fromUser = user?.profileTypes || [];
    return Array.from(new Set([...fromUser, ...fromTemplates])).sort();
  }, [sequenceTemplates, user?.profileTypes]);

  const languageOptions = React.useMemo(() => {
    const templateLanguages = sequenceTemplates
      .filter(template => !profileType || template.profileType === profileType)
      .map(template => template.language)
      .filter(Boolean);
    const configuredLanguages = user?.languages ? Object.keys(user.languages) : [];
    return Array.from(new Set([...templateLanguages, ...configuredLanguages, user?.defaultLanguage || 'en'])).sort();
  }, [sequenceTemplates, profileType, user?.languages, user?.defaultLanguage]);

  React.useEffect(() => {
    if (!profileType && profileTypeOptions.length > 0) {
      setProfileType(profileTypeOptions[0]);
    }
  }, [profileType, profileTypeOptions]);

  React.useEffect(() => {
    if (languageOptions.length > 0 && !languageOptions.includes(language)) {
      setLanguage(languageOptions[0]);
    }
  }, [language, languageOptions]);

  const leadsWithoutSequence = React.useMemo(
    () =>
      reviews
        .filter(review => !review.hasSequence)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [reviews]
  );

  const selectedLeads = React.useMemo(
    () => leadsWithoutSequence.filter(review => selectedLeadIds.has(review.id)),
    [leadsWithoutSequence, selectedLeadIds]
  );

  const matchingTemplateCount = sequenceTemplates.filter(
    template => template.profileType === profileType && template.language === language
  ).length;

  const showStatus = (kind: 'success' | 'error', message: string) => {
    if (kind === 'success') {
      setSuccessMessage(message);
      setErrorMessage('');
    } else {
      setErrorMessage(message);
      setSuccessMessage('');
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([fetchReviews(), fetchSequenceTemplates(), fetchSequenceMessages()]);
      showStatus('success', 'Sequence flow refreshed.');
    } catch (error) {
      showStatus('error', error instanceof Error ? error.message : 'Could not refresh sequence flow.');
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleLeadSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!user?.id) {
      showStatus('error', 'Please login before adding a lead.');
      return;
    }

    if (!leadForm.patientName.trim() || !leadForm.contactNumber.trim()) {
      showStatus('error', 'Lead name and WhatsApp number are required.');
      return;
    }

    setIsSavingLead(true);
    try {
      const review: Review = {
        id: crypto.randomUUID(),
        userId: user.id,
        patientName: toTitleCase(leadForm.patientName.trim()),
        appointmentDate: leadForm.appointmentDate
          ? new Date(leadForm.appointmentDate).toISOString()
          : new Date().toISOString(),
        contactNumber: leadForm.contactNumber.trim(),
        treatment: leadForm.treatment.trim(),
        notes: leadForm.notes.trim(),
        status: 'pending',
        hasSequence: false,
        aiReviewText: undefined,
        aiReviewFirstMessageSent: false,
        language,
        createdAt: new Date().toISOString(),
      };

      await addReview(review);
      setSelectedLeadIds(new Set([review.id]));
      setLeadForm({
        patientName: '',
        appointmentDate: new Date().toISOString().split('T')[0],
        contactNumber: '',
        treatment: '',
        notes: '',
      });
      setActiveTab('assign-sequence');
      showStatus('success', 'Lead saved. You can assign a sequence now.');
    } catch (error) {
      showStatus('error', error instanceof Error ? error.message : 'Could not save this lead.');
    } finally {
      setIsSavingLead(false);
    }
  };

  const toggleLead = (leadId: string) => {
    setSelectedLeadIds(previous => {
      const next = new Set(previous);
      if (next.has(leadId)) {
        next.delete(leadId);
      } else {
        next.add(leadId);
      }
      return next;
    });
  };

  const handleSelectAllLeads = () => {
    if (selectedLeadIds.size === leadsWithoutSequence.length) {
      setSelectedLeadIds(new Set());
      return;
    }

    setSelectedLeadIds(new Set(leadsWithoutSequence.map(review => review.id)));
  };

  const handleAssignSequence = async () => {
    if (selectedLeads.length === 0) {
      showStatus('error', 'Select at least one lead before assigning a sequence.');
      return;
    }

    if (!profileType || !language) {
      showStatus('error', 'Choose a profile type and language first.');
      return;
    }

    if (matchingTemplateCount === 0) {
      showStatus('error', `No templates found for ${profileType} in ${language}. Generate one in Sequence Creator first.`);
      return;
    }

    setIsAssigning(true);
    try {
      await createBulkSequenceMessages(selectedLeads, profileType, language);
      await Promise.all([fetchReviews(), fetchSequenceMessages()]);
      setSelectedLeadIds(new Set());
      setActiveTab('quick-send');
      showStatus('success', `Sequence assigned to ${selectedLeads.length} lead${selectedLeads.length === 1 ? '' : 's'}.`);
    } catch (error) {
      showStatus('error', error instanceof Error ? error.message : 'Could not assign sequence.');
    } finally {
      setIsAssigning(false);
    }
  };

  const renderLeadEntry = () => (
    <div className="bg-white shadow rounded-lg p-6">
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-gray-900">Add Lead</h2>
        <p className="text-sm text-gray-600 mt-1">Create a sequence-ready lead without opening the review request window.</p>
      </div>

      <form onSubmit={handleLeadSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Lead Name</label>
          <input
            type="text"
            value={leadForm.patientName}
            onChange={event => setLeadForm({ ...leadForm, patientName: event.target.value })}
            className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">WhatsApp Number</label>
          <input
            type="tel"
            value={leadForm.contactNumber}
            onChange={event => setLeadForm({ ...leadForm, contactNumber: event.target.value })}
            className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Visit / Lead Date</label>
          <input
            type="date"
            value={leadForm.appointmentDate}
            onChange={event => setLeadForm({ ...leadForm, appointmentDate: event.target.value })}
            className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Service / Interest</label>
          <input
            type="text"
            value={leadForm.treatment}
            onChange={event => setLeadForm({ ...leadForm, treatment: event.target.value })}
            className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          />
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
          <textarea
            value={leadForm.notes}
            onChange={event => setLeadForm({ ...leadForm, notes: event.target.value })}
            rows={3}
            className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          />
        </div>

        <div className="md:col-span-2 flex justify-end">
          <button
            type="submit"
            disabled={isSavingLead}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60"
          >
            {isSavingLead ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
            Save Lead
          </button>
        </div>
      </form>
    </div>
  );

  const renderAssignSequence = () => (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
      <div className="xl:col-span-2 bg-white shadow rounded-lg">
        <div className="p-5 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Pending Leads</h2>
            <p className="text-sm text-gray-600 mt-1">{leadsWithoutSequence.length} lead{leadsWithoutSequence.length === 1 ? '' : 's'} ready for sequence assignment.</p>
          </div>
          {leadsWithoutSequence.length > 0 && (
            <button
              onClick={handleSelectAllLeads}
              className="inline-flex items-center px-3 py-2 text-sm font-medium text-indigo-700 bg-indigo-50 rounded-md hover:bg-indigo-100"
            >
              {selectedLeadIds.size === leadsWithoutSequence.length ? <CheckSquare className="h-4 w-4 mr-2" /> : <Square className="h-4 w-4 mr-2" />}
              Select All
            </button>
          )}
        </div>

        <div className="divide-y divide-gray-200">
          {isLoadingReviews ? (
            <div className="p-8 text-center text-gray-600">Loading leads...</div>
          ) : leadsWithoutSequence.length === 0 ? (
            <div className="p-8 text-center text-gray-600">No pending leads. Add one from Lead Entry.</div>
          ) : (
            leadsWithoutSequence.map(review => (
              <button
                key={review.id}
                onClick={() => toggleLead(review.id)}
                className="w-full p-4 text-left hover:bg-gray-50 flex items-start gap-3"
              >
                {selectedLeadIds.has(review.id) ? (
                  <CheckSquare className="h-5 w-5 text-indigo-600 mt-0.5" />
                ) : (
                  <Square className="h-5 w-5 text-gray-400 mt-0.5" />
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                    <p className="font-medium text-gray-900 truncate">{review.patientName}</p>
                    <span className="text-xs text-gray-500">{new Date(review.appointmentDate).toLocaleDateString()}</span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">{review.contactNumber}</p>
                  {(review.treatment || review.notes) && (
                    <p className="text-sm text-gray-500 mt-1 line-clamp-2">{review.treatment || review.notes}</p>
                  )}
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      <div className="bg-white shadow rounded-lg p-5 h-fit">
        <h2 className="text-lg font-semibold text-gray-900">Assign Sequence</h2>
        <p className="text-sm text-gray-600 mt-1">Choose the template group, then create scheduled messages for selected leads.</p>

        <div className="mt-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Profile Type</label>
            <select
              value={profileType}
              onChange={event => setProfileType(event.target.value)}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            >
              {profileTypeOptions.length === 0 ? (
                <option value="">No profile types</option>
              ) : (
                profileTypeOptions.map(option => (
                  <option key={option} value={option}>{option}</option>
                ))
              )}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Language</label>
            <select
              value={language}
              onChange={event => setLanguage(event.target.value)}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            >
              {languageOptions.map(option => (
                <option key={option} value={option}>{LANGUAGE_NAMES[option] || option.toUpperCase()}</option>
              ))}
            </select>
          </div>

          <div className="rounded-md bg-gray-50 p-3 text-sm text-gray-700">
            <div className="flex items-center justify-between">
              <span>Selected leads</span>
              <strong>{selectedLeads.length}</strong>
            </div>
            <div className="flex items-center justify-between mt-2">
              <span>Matching templates</span>
              <strong>{matchingTemplateCount}</strong>
            </div>
          </div>

          {matchingTemplateCount === 0 && (
            <div className="rounded-md bg-amber-50 p-3 text-sm text-amber-800 flex gap-2">
              <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <span>Create templates for this profile and language in the Sequence Creator tab.</span>
            </div>
          )}

          <button
            onClick={handleAssignSequence}
            disabled={isAssigning || selectedLeads.length === 0 || matchingTemplateCount === 0}
            className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60"
          >
            {isAssigning ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Clock className="h-4 w-4 mr-2" />}
            Assign Sequence
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Sequence Sending Flow</h1>
          <p className="text-sm text-gray-600 mt-1">Enter leads, assign a campaign, create templates, and send due messages from one workspace.</p>
        </div>
        <div className="flex items-center space-x-3">
          <WhatsAppStatusIndicator showLabel={true} size="sm" />
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="inline-flex items-center justify-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-60"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {(successMessage || errorMessage) && (
        <div className={`rounded-md p-4 flex items-start gap-3 ${successMessage ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
          {successMessage ? <CheckCircle className="h-5 w-5 flex-shrink-0" /> : <AlertCircle className="h-5 w-5 flex-shrink-0" />}
          <span className="text-sm font-medium">{successMessage || errorMessage}</span>
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-lg p-1 flex flex-col sm:flex-row gap-1">
        {tabs.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 inline-flex items-center justify-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <Icon className="h-4 w-4 mr-2" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {activeTab === 'lead-entry' && renderLeadEntry()}
      {activeTab === 'assign-sequence' && renderAssignSequence()}
      {activeTab === 'sequence-creator' && <AISequenceTemplateGeneratorPage />}
      {activeTab === 'quick-send' && <SimplifiedSequenceMessagesPage />}
    </div>
  );
}
