import React, { useState } from 'react';
import { X, Clock, Globe, Users, Info } from 'lucide-react';
import type { Review } from '../types';
import { useStore } from '../store/useStore';

const LANGUAGE_NAMES: Record<string, string> = {
  en: 'English',
  hi: 'Hindi',
  gu: 'Gujarati',
  mr: 'Marathi'
};

interface SequenceOptionsModalProps {
  review: Review;
  onConfirm: (profileType: string, language: string) => void;
  onClose: () => void;
}

export function SequenceOptionsModal({
  review,
  onConfirm,
  onClose
}: SequenceOptionsModalProps) {
  console.log('[SEQUENCE OPTIONS MODAL] Component rendering with:', {
    reviewId: review.id,
    patientName: review.patientName
  });
  
  const { user, sequenceTemplates } = useStore();
  
  console.log('[SEQUENCE OPTIONS MODAL] Store data:', {
    hasUser: !!user,
    sequenceTemplatesCount: (sequenceTemplates || []).length,
    sequenceTemplates: sequenceTemplates
  });
  
  // Get unique profile types from existing templates (both user and global)
  const availableProfileTypes = Array.from(
    new Set((sequenceTemplates || []).map(t => t.profileType))
  ).sort();
  
  console.log('[SEQUENCE OPTIONS MODAL] Available profile types:', availableProfileTypes);
  
  const [selectedProfileType, setSelectedProfileType] = useState<string>(
    availableProfileTypes.includes('General') ? 'General' : (availableProfileTypes[0] || 'General')
  );
  const [selectedLanguage, setSelectedLanguage] = useState<string>('en');
  const [isConfirming, setIsConfirming] = useState(false);

  // Get available languages for the selected profile type
  const getAvailableLanguages = () => {
    const languagesForProfile = Array.from(
      new Set(
        (sequenceTemplates || [])
          .filter(t => t.profileType === selectedProfileType)
          .map(t => t.language)
      )
    );
    
    return languagesForProfile.map(code => ({
      code,
      name: LANGUAGE_NAMES[code] || code
    }));
  };
  
  const availableLanguages = getAvailableLanguages();
  
  // Update selected language when profile type changes
  React.useEffect(() => {
    const languages = getAvailableLanguages();
    if (languages.length > 0 && !languages.find(l => l.code === selectedLanguage)) {
      setSelectedLanguage(languages[0].code);
    }
  }, [selectedProfileType]);

  // Get template count for the selected profile type and language
  const getTemplateCount = () => {
    const count = (sequenceTemplates || []).filter(t => 
      t.profileType === selectedProfileType && t.language === selectedLanguage
    ).length;
    
    return `${count} template${count !== 1 ? 's' : ''} available for ${selectedProfileType} in ${LANGUAGE_NAMES[selectedLanguage] || selectedLanguage}`;
  };

  const handleConfirm = async () => {
    setIsConfirming(true);
    try {
      await onConfirm(selectedProfileType, selectedLanguage);
      onClose();
    } catch (error) {
      console.error('Error confirming sequence creation:', error);
    } finally {
      setIsConfirming(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-lg max-w-md w-full my-8 max-h-[calc(100vh-2rem)] flex flex-col">
        {/* Header - Fixed */}
        <div className="p-4 sm:p-6 border-b flex justify-between items-center flex-shrink-0">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <Clock className="h-5 w-5 mr-2 text-indigo-600" />
            Create Follow-up Sequence
          </h3>
          <button 
            onClick={onClose} 
            className="p-1 hover:bg-gray-100 rounded"
            disabled={isConfirming}
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        
        {/* Content - Scrollable */}
        <div className="p-4 sm:p-6 space-y-4 sm:space-y-6 overflow-y-auto flex-1">
          <div className="bg-gray-50 p-3 sm:p-4 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-2">Patient Information</h4>
            <div className="space-y-1 text-sm text-gray-600">
              <p><span className="font-medium">Name:</span> {review.patientName}</p>
              <p><span className="font-medium">Contact:</span> {review.contactNumber}</p>
              <p><span className="font-medium">Visit Date:</span> {new Date(review.appointmentDate).toLocaleDateString()}</p>
              {review.treatment && <p><span className="font-medium">Treatment:</span> {review.treatment}</p>}
              {review.hasSequence && (
                <p className="text-orange-600 text-xs">⚠️ This patient already has a sequence</p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Clock className="h-4 w-4 inline-block mr-1" />
              Profile Type
            </label>
            <select
              value={selectedProfileType}
              onChange={(e) => setSelectedProfileType(e.target.value)}
              disabled={isConfirming}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            >
              {availableProfileTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-gray-500">
              Select from available profile types with existing templates
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Globe className="h-4 w-4 inline-block mr-1" />
              Language
            </label>
            <select
              value={selectedLanguage}
              onChange={(e) => setSelectedLanguage(e.target.value)}
              disabled={isConfirming}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            >
              {availableLanguages.map((lang) => (
                <option key={lang.code} value={lang.code}>
                  {lang.name}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-gray-500">
              Choose the language for the follow-up messages
            </p>
          </div>

          <div className="bg-blue-50 p-3 sm:p-4 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-2">📅 Smart Date Randomization</h4>
            <p className="text-sm text-blue-800">
              Message dates will be automatically randomized by ±3 days to prevent WhatsApp account restrictions.
            </p>
          </div>
        </div>
        
        {/* Template Information */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start">
            <Info className="h-5 w-5 text-blue-600 mr-2 mt-0.5" />
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-1">Template Access</p>
              <p>{getTemplateCount()}</p>
              {user?.profileTypes && user.profileTypes.length > 0 && (
                <p className="mt-2">
                  <span className="font-medium">Your profile types:</span> {user.profileTypes.join(', ')}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Footer - Fixed */}
        <div className="p-4 sm:p-6 border-t bg-gray-50 flex justify-end space-x-3 flex-shrink-0">
          <button
            onClick={onClose}
            disabled={isConfirming}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={isConfirming}
            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 disabled:opacity-50 flex items-center"
          >
            {isConfirming ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Creating...
              </>
            ) : (
              'Create Sequence'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}