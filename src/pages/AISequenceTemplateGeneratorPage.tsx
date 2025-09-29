import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import { Sparkles, Save, Trash2, Edit3, Check, X, AlertCircle, CheckCircle, Wand2, Users, Globe } from 'lucide-react';
import type { ProfileType, SequenceTemplate } from '../types';
import { AVAILABLE_PROFILE_TYPES, DEFAULT_PROFILE_TYPES } from '../constants/profileTypes';

const LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'hi', name: 'Hindi' },
  { code: 'gu', name: 'Gujarati' },
  { code: 'mr', name: 'Marathi' }
];

export function AISequenceTemplateGeneratorPage() {
  const { 
    user,
    sequenceTemplates,
    aiGeneratedTemplates,
    isLoadingAIGeneration,
    generateAISequenceTemplates,
    saveAIGeneratedTemplates,
    clearAIGeneratedTemplates
  } = useStore();

  const [formData, setFormData] = useState({
    theme: '',
    details: '',
    numMessages: 3,
    language: 'en',
    profileType: 'General' as ProfileType,
    targetProfileType: '',
    isGlobal: false
  });

  const [customProfileType, setCustomProfileType] = useState('');
  const [selectedTemplates, setSelectedTemplates] = useState<Set<string>>(new Set());
  const [editingTemplate, setEditingTemplate] = useState<string | null>(null);
  const [editedTemplates, setEditedTemplates] = useState<{ [key: string]: SequenceTemplate }>({});
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Check if user can create global templates (admin or super_admin)
  const canCreateGlobalTemplates = user?.role === 'admin' || user?.role === 'super_admin';

  // Get unique profile types from existing templates
  const existingProfileTypes = Array.from(
    new Set(sequenceTemplates.map(t => t.profileType))
  ).sort();

  // Combine default and existing profile types
  const allProfileTypes = Array.from(
    new Set([...DEFAULT_PROFILE_TYPES, ...existingProfileTypes])
  ).sort();

  const handleGenerate = async () => {
    if (!formData.theme.trim()) {
      setError('Please enter a theme for the sequence messages.');
      return;
    }

    setError('');
    setSuccess('');

    try {
      await generateAISequenceTemplates(
        formData.theme,
        formData.details,
        formData.numMessages,
        formData.language,
        customProfileType || formData.profileType,
        formData.isGlobal,
        formData.targetProfileType
      );
      
      // Auto-select all generated templates
      const allIds = new Set(aiGeneratedTemplates.map(t => t.id));
      setSelectedTemplates(allIds);
      
      setSuccess(`Successfully generated ${formData.numMessages} sequence templates!`);
    } catch (error) {
      console.error('Error generating templates:', error);
      setError(error instanceof Error ? error.message : 'Failed to generate templates');
    }
  };

  const handleTemplateSelect = (templateId: string, checked: boolean) => {
    const newSelected = new Set(selectedTemplates);
    if (checked) {
      newSelected.add(templateId);
    } else {
      newSelected.delete(templateId);
    }
    setSelectedTemplates(newSelected);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allIds = new Set(aiGeneratedTemplates.map(t => t.id));
      setSelectedTemplates(allIds);
    } else {
      setSelectedTemplates(new Set());
    }
  };

  const handleEditTemplate = (templateId: string) => {
    const template = aiGeneratedTemplates.find(t => t.id === templateId);
    if (template) {
      setEditedTemplates({
        ...editedTemplates,
        [templateId]: { ...template }
      });
      setEditingTemplate(templateId);
    }
  };

  const handleSaveEdit = (templateId: string) => {
    setEditingTemplate(null);
  };

  const handleCancelEdit = (templateId: string) => {
    const newEdited = { ...editedTemplates };
    delete newEdited[templateId];
    setEditedTemplates(newEdited);
    setEditingTemplate(null);
  };

  const handleSaveSelected = async () => {
    if (selectedTemplates.size === 0) {
      setError('Please select at least one template to save.');
      return;
    }

    setIsSaving(true);
    setError('');
    setSuccess('');

    try {
      const templatesToSave = aiGeneratedTemplates
        .filter(template => selectedTemplates.has(template.id))
        .map(template => {
          // Use edited version if available and add global/profile settings
          const editedTemplate = editedTemplates[template.id];
          const finalTemplate = editedTemplate || template;
          
          // Enforce RLS policy: only admin/super_admin can create global templates
          const canCreateGlobal = user?.role === 'admin' || user?.role === 'super_admin';
          const shouldBeGlobal = formData.isGlobal && canCreateGlobal;
          
          return {
            ...finalTemplate,
            userId: shouldBeGlobal ? null : user?.id,
            targetProfileType: shouldBeGlobal && formData.targetProfileType ? formData.targetProfileType : null
          };
        });

      await saveAIGeneratedTemplates(templatesToSave);
      setSelectedTemplates(new Set());
      setEditedTemplates({});
      setSuccess(`Successfully saved ${templatesToSave.length} sequence templates!`);
    } catch (error) {
      console.error('Error saving templates:', error);
      setError(error instanceof Error ? error.message : 'Failed to save templates');
    } finally {
      setIsSaving(false);
    }
  };

  const handleClearAll = () => {
    clearAIGeneratedTemplates();
    setSelectedTemplates(new Set());
    setEditedTemplates({});
    setEditingTemplate(null);
    setSuccess('');
    setError('');
  };

  const getDisplayTemplate = (template: SequenceTemplate) => {
    return editedTemplates[template.id] || template;
  };

  const allSelected = aiGeneratedTemplates.length > 0 && 
    aiGeneratedTemplates.every(t => selectedTemplates.has(t.id));
  const someSelected = aiGeneratedTemplates.some(t => selectedTemplates.has(t.id)) && !allSelected;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <Wand2 className="h-8 w-8 text-purple-600 mr-3" />
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">AI Sequence Generator</h1>
            <p className="text-gray-600">Create custom sequence templates using AI</p>
          </div>
        </div>
      </div>

      {/* Generation Form */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-medium mb-4 flex items-center">
          <Sparkles className="h-5 w-5 mr-2 text-purple-600" />
          Generate Sequence Templates
        </h2>

        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Theme *</label>
              <input
                type="text"
                required
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
                value={formData.theme}
                onChange={(e) => setFormData({ ...formData, theme: e.target.value })}
                placeholder="e.g., Diabetes awareness, Heart health, Post-surgery care"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Profile Type</label>
              <div className="space-y-2">
                <input
                  type="text"
                  list="profile-types"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
                  value={customProfileType || formData.profileType}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (allProfileTypes.includes(value)) {
                      setFormData({ ...formData, profileType: value as ProfileType });
                      setCustomProfileType('');
                    } else {
                      setCustomProfileType(value);
                      setFormData({ ...formData, profileType: value as ProfileType });
                    }
                  }}
                  placeholder="Select existing or type custom profile type"
                />
                <datalist id="profile-types">
                  {allProfileTypes.map((type) => (
                    <option key={type} value={type} />
                  ))}
                </datalist>
                <p className="text-xs text-gray-500">
                  Choose from existing types or create a new custom profile type
                </p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Number of Messages</label>
              <select
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
                value={formData.numMessages}
                onChange={(e) => setFormData({ ...formData, numMessages: parseInt(e.target.value) })}
              >
                <option value={2}>2 Messages</option>
                <option value={3}>3 Messages</option>
                <option value={4}>4 Messages</option>
                <option value={5}>5 Messages</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Language</label>
              <select
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
                value={formData.language}
                onChange={(e) => setFormData({ ...formData, language: e.target.value })}
              >
                {LANGUAGES.map((lang) => (
                  <option key={lang.code} value={lang.code}>
                    {lang.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Template Sharing Options */}
          {canCreateGlobalTemplates && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-medium text-blue-900 mb-3 flex items-center">
                <Users className="h-4 w-4 mr-2" />
                Template Sharing Options
              </h4>
              
              <div className="space-y-3">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="templateSharing"
                    checked={!formData.isGlobal}
                    onChange={() => setFormData({ ...formData, isGlobal: false, targetProfileType: '' })}
                    className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300"
                  />
                  <span className="ml-2 text-sm text-blue-800">
                    <strong>Personal Templates</strong> - Only visible to you
                  </span>
                </label>
                
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="templateSharing"
                    checked={formData.isGlobal && !formData.targetProfileType}
                    onChange={() => setFormData({ ...formData, isGlobal: true, targetProfileType: '' })}
                    className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300"
                  />
                  <span className="ml-2 text-sm text-blue-800">
                    <strong>Global Templates</strong> - Visible to all users
                  </span>
                </label>
                
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="templateSharing"
                    checked={formData.isGlobal && !!formData.targetProfileType}
                    onChange={() => setFormData({ ...formData, isGlobal: true, targetProfileType: AVAILABLE_PROFILE_TYPES[0] })}
                    className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300"
                  />
                  <span className="ml-2 text-sm text-blue-800">
                    <strong>Profile-Specific Global</strong> - Visible to users with specific profile type
                  </span>
                </label>
                
                {formData.isGlobal && formData.targetProfileType !== '' && (
                  <div className="ml-6">
                    <select
                      value={formData.targetProfileType}
                      onChange={(e) => setFormData({ ...formData, targetProfileType: e.target.value })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500 text-sm"
                    >
                      {AVAILABLE_PROFILE_TYPES.map((profileType) => (
                        <option key={profileType} value={profileType}>
                          {profileType}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700">Additional Details</label>
            <textarea
              rows={3}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
              value={formData.details}
              onChange={(e) => setFormData({ ...formData, details: e.target.value })}
              placeholder="Provide specific details, focus areas, or special instructions for the AI to consider..."
            />
            <p className="mt-1 text-xs text-gray-500">
              Optional: Add specific requirements, target audience details, or special considerations
            </p>
          </div>

          {/* Status Messages */}
          {error && (
            <div className="rounded-md bg-red-50 p-4">
              <div className="flex">
                <AlertCircle className="h-5 w-5 text-red-400 mr-2" />
                <div className="text-sm text-red-700">{error}</div>
              </div>
            </div>
          )}

          {success && (
            <div className="rounded-md bg-green-50 p-4">
              <div className="flex">
                <CheckCircle className="h-5 w-5 text-green-400 mr-2" />
                <div className="text-sm text-green-700">{success}</div>
              </div>
            </div>
          )}

          <div className="flex justify-end">
            <button
              onClick={handleGenerate}
              disabled={isLoadingAIGeneration || !formData.theme.trim()}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoadingAIGeneration ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Generate Templates
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Generated Templates */}
      {aiGeneratedTemplates.length > 0 && (
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-medium text-gray-900">Generated Templates</h2>
            <div className="flex items-center space-x-3">
              <label className="flex items-center text-sm">
                <input
                  type="checkbox"
                  checked={allSelected}
                  ref={(input) => {
                    if (input) input.indeterminate = someSelected;
                  }}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                  className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded mr-2"
                />
                Select All ({selectedTemplates.size}/{aiGeneratedTemplates.length})
              </label>
              <button
                onClick={handleClearAll}
                className="text-sm text-gray-600 hover:text-red-600 transition-colors"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="space-y-4">
            {aiGeneratedTemplates.map((template) => {
              const displayTemplate = getDisplayTemplate(template);
              const isEditing = editingTemplate === template.id;
              const isSelected = selectedTemplates.has(template.id);

              return (
                <div
                  key={template.id}
                  className={`border rounded-lg p-4 transition-all ${
                    isSelected ? 'border-purple-300 bg-purple-50' : 'border-gray-200'
                  }`}
                >
                  <div className="flex items-start space-x-3">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={(e) => handleTemplateSelect(template.id, e.target.checked)}
                      className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded mt-1"
                    />
                    
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-4">
                          <span className="text-sm font-medium text-gray-900">
                            Message {displayTemplate.sequenceOrder}
                          </span>
                          <span className="text-sm text-gray-500">
                            Day {displayTemplate.sequenceDays}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2">
                          {!isEditing ? (
                            <button
                              onClick={() => handleEditTemplate(template.id)}
                              className="text-gray-400 hover:text-purple-600 transition-colors"
                            >
                              <Edit3 className="h-4 w-4" />
                            </button>
                          ) : (
                            <div className="flex items-center space-x-1">
                              <button
                                onClick={() => handleSaveEdit(template.id)}
                                className="text-green-600 hover:text-green-700 transition-colors"
                              >
                                <Check className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleCancelEdit(template.id)}
                                className="text-red-600 hover:text-red-700 transition-colors"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      {isEditing ? (
                        <div className="space-y-3">
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs font-medium text-gray-700">Sequence Days</label>
                              <input
                                type="number"
                                min="1"
                                max="365"
                                value={displayTemplate.sequenceDays}
                                onChange={(e) => setEditedTemplates({
                                  ...editedTemplates,
                                  [template.id]: {
                                    ...displayTemplate,
                                    sequenceDays: parseInt(e.target.value) || 1
                                  }
                                })}
                                className="mt-1 block w-full text-sm rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-700">Sequence Order</label>
                              <input
                                type="number"
                                min="1"
                                value={displayTemplate.sequenceOrder}
                                onChange={(e) => setEditedTemplates({
                                  ...editedTemplates,
                                  [template.id]: {
                                    ...displayTemplate,
                                    sequenceOrder: parseInt(e.target.value) || 1
                                  }
                                })}
                                className="mt-1 block w-full text-sm rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
                              />
                            </div>
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700">Message Template</label>
                            <textarea
                              rows={6}
                              value={displayTemplate.messageTemplate}
                              onChange={(e) => setEditedTemplates({
                                ...editedTemplates,
                                [template.id]: {
                                  ...displayTemplate,
                                  messageTemplate: e.target.value
                                }
                              })}
                              className="mt-1 block w-full text-sm rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="bg-gray-50 p-3 rounded-md">
                          <pre className="text-sm text-gray-700 whitespace-pre-wrap font-sans">
                            {displayTemplate.messageTemplate}
                          </pre>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {selectedTemplates.size > 0 && (
            <div className="mt-6 flex justify-end">
              <button
                onClick={handleSaveSelected}
                disabled={isSaving}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Selected ({selectedTemplates.size})
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Information Panel */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <div className="flex items-start">
          <Sparkles className="h-6 w-6 text-blue-600 mr-3 mt-1" />
          <div>
            <h3 className="text-lg font-medium text-blue-900 mb-2">How AI Sequence Generation Works</h3>
            <div className="text-sm text-blue-800 space-y-2">
              <p>
                Our AI creates WhatsApp-friendly sequence messages tailored to your clinic's needs:
              </p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>Each message follows a structured format: greeting, educational content, and call-to-action</li>
                <li>Messages are spaced appropriately to avoid overwhelming patients</li>
                <li>Content is customized based on your theme, profile type, and additional details</li>
                <li>Templates include placeholders for patient name, clinic name, and contact information</li>
                <li>You can edit any generated message before saving to your sequence library</li>
                {canCreateGlobalTemplates && (
                  <>
                    <li>As an admin, you can create global templates that are shared with all users</li>
                    <li>Profile-specific global templates are only visible to users with matching profile types</li>
                  </>
                )}
              </ul>
              <p className="mt-3">
                <strong>Tip:</strong> Be specific in your theme and details for better AI-generated content. 
                For example: "Diabetes management focusing on diet control and regular monitoring" 
                works better than just "Diabetes".
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}