import React from 'react';
import { Clock, CheckCircle } from 'lucide-react';
import type { Review } from '../types';

interface InteractiveStatusBadgeProps {
  review: Review;
  onToggleStatus: (reviewId: string, newStatus: Review['status']) => void;
}

export function InteractiveStatusBadge({ review, onToggleStatus }: InteractiveStatusBadgeProps) {
  const handleClick = () => {
    const newStatus = review.status === 'pending' ? 'sent' : 'pending';
    onToggleStatus(review.id, newStatus);
  };

  const isPending = review.status === 'pending';

  return (
    <button
      onClick={handleClick}
      className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold transition-all duration-200 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 ${
        isPending
          ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200 focus:ring-yellow-500'
          : 'bg-green-100 text-green-800 hover:bg-green-200 focus:ring-green-500'
      }`}
      title={`Click to mark as ${isPending ? 'sent' : 'pending'}`}
    >
      {isPending ? (
        <>
          <Clock className="h-3 w-3 mr-1" />
          Pending
        </>
      ) : (
        <>
          <CheckCircle className="h-3 w-3 mr-1" />
          Sent
        </>
      )}
    </button>
  );
}