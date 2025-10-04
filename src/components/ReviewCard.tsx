
import { format } from 'date-fns';
import { MessageCircle } from 'lucide-react';
import { InteractiveStatusBadge } from './InteractiveStatusBadge';
import { ReviewActionsDropdown } from './ReviewActionsDropdown';
import type { Review } from '../types';

interface ReviewCardProps {
  review: Review;
  onOpenSendMessagesModal: (review: Review) => void;
  onCreateFollowup: () => void;
  onToggleStatus: (reviewId: string, newStatus: Review['status']) => void;
  hasGMBLink: boolean;
  isValidDate: (date: any) => boolean;
  isLoadingTemplates: boolean;
  hasTemplates: boolean;
  onEditAIReview?: (review: Review) => void;
  onEditReview?: (review: Review) => void;
  onDeleteReview?: (review: Review) => void;
}

export function ReviewCard({
  review,
  onOpenSendMessagesModal,
  onCreateFollowup,
  onToggleStatus,
  hasGMBLink,
  isValidDate,
  isLoadingTemplates,
  hasTemplates,
  onEditAIReview,
  onEditReview,
  onDeleteReview
}: ReviewCardProps) {
  // Add logging for props
  console.log('[REVIEW CARD] Props received:', {
    reviewId: review.id,
    patientName: review.patientName,
    isLoadingTemplates,
    hasTemplates
  });
  
  return (
    <div className={`bg-white border rounded-lg p-4 shadow-sm transition-all duration-200 hover:shadow-md ${
      review.status === 'pending' ? 'bg-yellow-50 border-yellow-200' : 'border-gray-200'
    }`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900 text-lg">{review.patientName || 'Unknown Patient'}</h3>
          <p className="text-sm text-gray-600 mt-1">
            {isValidDate(review.appointmentDate)
              ? format(new Date(review.appointmentDate), 'PPP')
              : 'N/A'}
          </p>
        </div>
        <InteractiveStatusBadge review={review} onToggleStatus={onToggleStatus} />
      </div>

      {/* Details */}
      <div className="space-y-2 mb-4">
        <div className="flex items-center text-sm text-gray-600">
          <span className="font-medium">Contact:</span>
          <span className="ml-2">{review.contactNumber}</span>
        </div>
        
        {(review.treatment || review.notes) && (
          <div className="text-sm text-gray-600">
            <span className="font-medium">Details:</span>
            <div className="mt-1">
              {review.treatment && <span className="font-medium">{review.treatment}</span>}
              {review.treatment && review.notes && <span className="mx-1">-</span>}
              {review.notes}
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between pt-3 border-t border-gray-100">
        <div className="flex-1">
          <button
            onClick={() => onOpenSendMessagesModal(review)}
            disabled={isLoadingTemplates || !hasTemplates}
            className="w-full inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
            title={isLoadingTemplates ? 'Loading templates...' : !hasTemplates ? 'Templates not available' : 'Open message sending dialog'}
          >
            <MessageCircle className="w-4 h-4 mr-2" />
            {isLoadingTemplates ? 'Loading...' : 'Send Messages'}
          </button>
        </div>
        
        <div className="ml-3">
          <ReviewActionsDropdown
            review={review}
            onOpenSendMessagesModal={onOpenSendMessagesModal}
            onCreateFollowup={onCreateFollowup}
            hasGMBLink={hasGMBLink}
            isLoadingTemplates={isLoadingTemplates}
            hasTemplates={hasTemplates}
            onEditAIReview={onEditAIReview}
            onEditReview={onEditReview}
            onDeleteReview={onDeleteReview}
          />
        </div>
      </div>
    </div>
  );
}