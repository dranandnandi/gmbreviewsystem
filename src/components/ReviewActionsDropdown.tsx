import { useState, useRef, useEffect } from 'react';
import { MoreVertical, MessageCircle, Clock, ChevronRight } from 'lucide-react';
import type { Review } from '../types';

interface ReviewActionsDropdownProps {
  review: Review;
  onOpenSendMessagesModal: (review: Review) => void;
  onCreateFollowup: () => void;
  hasGMBLink: boolean;
  isLoadingTemplates: boolean;
  hasTemplates: boolean;
  onEditAIReview?: (review: Review) => void; // Opens AI review editor modal
  onEditReview?: (review: Review) => void; // Opens core review edit modal
  onDeleteReview?: (review: Review) => void; // Delete review with confirmation
}

export function ReviewActionsDropdown({
  review,
  onOpenSendMessagesModal,
  onCreateFollowup,
  hasGMBLink: _hasGMBLink, // Unused but kept for interface compatibility
  isLoadingTemplates,
  hasTemplates,
  onEditAIReview,
  onEditReview,
  onDeleteReview
}: ReviewActionsDropdownProps) {
  // Add logging for props
  console.log('[REVIEW ACTIONS DROPDOWN] Props received:', {
    reviewId: review.id,
    patientName: review.patientName,
    isLoadingTemplates,
    hasTemplates
  });
  
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleAction = (action: () => void) => {
    action();
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
        title="More actions"
      >
        <MoreVertical className="h-4 w-4" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-1 w-56 bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 z-50">
          <div className="py-1" role="menu">
            <button
              onClick={() => handleAction(() => onOpenSendMessagesModal(review))}
              disabled={isLoadingTemplates || !hasTemplates}
              className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
              role="menuitem"
              title={isLoadingTemplates ? 'Loading templates...' : !hasTemplates ? 'Templates not available' : 'Open message sending dialog'}
            >
              <MessageCircle className="h-4 w-4 mr-3 text-indigo-500" />
              {isLoadingTemplates ? 'Loading Templates...' : 'Send Messages'}
            </button>

            {onEditAIReview && (
              <button
                onClick={() => handleAction(() => onEditAIReview(review))}
                className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                role="menuitem"
                title={review.aiReviewText ? 'Edit generated AI review text' : 'Generate and edit AI review text'}
              >
                {/* Reuse MessageCircle icon for simplicity; could import a different icon if desired */}
                <MessageCircle className="h-4 w-4 mr-3 text-green-500" />
                {review.aiReviewText ? 'Edit AI Review' : 'Generate AI Review'}
              </button>
            )}
            {onEditReview && (
              <button
                onClick={() => handleAction(() => onEditReview(review))}
                className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                role="menuitem"
                title="Edit core patient & visit fields"
              >
                <MessageCircle className="h-4 w-4 mr-3 text-blue-500" />
                Edit Details
              </button>
            )}

            <button
              onClick={() => handleAction(onCreateFollowup)}
              disabled={review.hasSequence}
              className="flex items-center justify-between w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              role="menuitem"
            >
              <div className="flex items-center">
                <Clock className="h-4 w-4 mr-3 text-purple-500" />
                {review.hasSequence ? 'Follow-ups Created' : 'Create Follow-up Messages'}
              </div>
              {!review.hasSequence && <ChevronRight className="h-3 w-3 text-gray-400" />}
            </button>

            {onDeleteReview && (
              <>
                <div className="border-t border-gray-100 my-1"></div>
                <button
                  onClick={() => handleAction(() => {
                    if (window.confirm(`Are you sure you want to delete the review for ${review.patientName}? This action cannot be undone.`)) {
                      onDeleteReview(review);
                    }
                  })}
                  className="flex items-center w-full px-4 py-2 text-sm text-red-700 hover:bg-red-50 transition-colors"
                  role="menuitem"
                  title="Delete this review permanently"
                >
                  <svg className="h-4 w-4 mr-3 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Delete Review
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}