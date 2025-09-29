import React, { useState } from 'react';
import { X, Clock, Globe, Users, Info, AlertTriangle } from 'lucide-react';
import type { Review } from '../types';

const LANGUAGE_NAMES: Record<string, string> = {
  en: 'English',
  hi: 'Hindi',
  gu: 'Gujarati',
  mr: 'Marathi'
};

const LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'hi', name: 'Hindi' },
  { code: 'gu', name: 'Gujarati' },
  { code: 'mr', name: 'Marathi' }
];

interface BulkCreateSequenceModalProps {
  reviews: Review[];
  onConfirm: (profileType: string, language: string) => Promise<void>;
  onClose: () => void;
}

export function BulkCreateSequenceModal({
  reviews,
  onConfirm,
  onClose
}: BulkCreateSequenceModalProps) {
  console.log('[BULK CREATE SEQUENCE MODAL] Component rendering with:', {
    reviewsCount: reviews.length,
    reviewIds: reviews.map(r => r.id)
  });
  
  const [selectedLanguage, setSelectedLanguage] = useState<string>('en');
  const [isConfirming, setIsConfirming] = useState(false);

  // Filter reviews that don't already have sequences
  const eligibleReviews = reviews.filter(review => !review.hasSequence);
  const reviewsWithSequences = reviews.filter(review => review.hasSequence);

  const handleConfirm = async () => {
    setIsConfirming(true);
    try {
      await onConfirm('General', selectedLanguage);
      onClose();
    } catch (error) {
      console.error('Error confirming bulk sequence creation:', error);
    } finally {
      setIsConfirming(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-lg max-w-2xl w-full my-8 max-h-[calc(100vh-2rem)] flex flex-col">
        {/* Header - Fixed */}
        <div className="p-4 sm:p-6 border-b flex justify-between items-center flex-shrink-0">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <Clock className="h-5 w-5 mr-2 text-indigo-600" />
            Create Bulk Follow-up Sequences
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
          {/* Selected Patients Summary */}
          <div className="bg-gray-50 p-3 sm:p-4 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-2">
              Selected Patients ({reviews.length})
            </h4>
            <div className="space-y-2 text-sm text-gray-600 max-h-40 overflow-y-auto">
              {reviews.map((review) => (
                <div key={review.id} className="flex items-center justify-between py-1 border-b border-gray-200 last:border-b-0">
                  <span className="font-medium">{review.patientName}</span>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs text-gray-500">
                      {new Date(review.appointmentDate).toLocaleDateString()}
                    </span>
                    {review.hasSequence && (
                      <span className="text-xs text-orange-600 bg-orange-100 px-2 py-1 rounded">
                        Has sequence
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Warning for patients with existing sequences */}
          {reviewsWithSequences.length > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-start">
                <AlertTriangle className="h-5 w-5 text-yellow-600 mr-2 mt-0.5" />
                <div className="text-sm text-yellow-800">
                  <p className="font-medium mb-1">Some patients already have sequences</p>
                  <p>
                    {reviewsWithSequences.length} patient{reviewsWithSequences.length > 1 ? 's' : ''} already have follow-up sequences and will be skipped.
                    Only {eligibleReviews.length} patient{eligibleReviews.length > 1 ? 's' : ''} will have new sequences created.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Profile Type (Fixed to General) */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-medium text-blue-900 mb-2 flex items-center">
              <Users className="h-4 w-4 mr-2" />
              Profile Type
            </h4>
            <div className="text-sm text-blue-800">
              <p className="font-medium">General Profile</p>
              <p className="mt-1">All sequences will be created using the General profile type with standard follow-up templates.</p>
            </div>
          </div>

          {/* Language Selection */}
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
              {LANGUAGES.map((lang) => (
                <option key={lang.code} value={lang.code}>
                  {lang.name}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-gray-500">
              Choose the language for the follow-up messages
            </p>
          </div>

          {/* Smart Date Randomization Info */}
          <div className="bg-blue-50 p-3 sm:p-4 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-2">📅 Smart Date Randomization</h4>
            <p className="text-sm text-blue-800">
              Message dates will be automatically randomized by ±3 days to prevent WhatsApp account restrictions.
            </p>
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
            disabled={isConfirming || eligibleReviews.length === 0}
            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 disabled:opacity-50 flex items-center"
          >
            {isConfirming ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Creating...
              </>
            ) : (
              `Create Sequences (${eligibleReviews.length})`
            )}
          </button>
        </div>
      </div>
    </div>
  );
}