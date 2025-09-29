import React, { useState, useEffect } from 'react';
import { X, Save, Send } from 'lucide-react';
import type { Review } from '../types';

interface AIReviewEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  review: Review | null;
  onSave: (reviewId: string, text: string) => Promise<void>;
  onQueueSuggestion?: (review: Review) => Promise<void>; // triggers ai_second queue
  isQueuing?: boolean;
}

export const AIReviewEditorModal: React.FC<AIReviewEditorModalProps> = ({
  isOpen,
  onClose,
  review,
  onSave,
  onQueueSuggestion,
  isQueuing = false
}) => {
  const [text, setText] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string>('');
  const [savedMessage, setSavedMessage] = useState('');

  useEffect(() => {
    if (review) {
      setText(review.aiReviewText || '');
      setError('');
      setSavedMessage('');
    }
  }, [review]);

  if (!isOpen || !review) return null;

  const handleSave = async () => {
    if (!text.trim()) {
      setError('Review text cannot be empty.');
      return;
    }
    setIsSaving(true);
    setError('');
    try {
      await onSave(review.id, text.trim());
      setSavedMessage('Saved');
      setTimeout(() => setSavedMessage(''), 2000);
    } catch (e:any) {
      setError(e.message || 'Failed to save');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveAndQueue = async () => {
    await handleSave();
    if (onQueueSuggestion) {
      try {
        await onQueueSuggestion({ ...review, aiReviewText: text.trim() });
      } catch (e) {
        console.error('Failed to queue suggestion after save:', e);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-lg font-semibold">AI Review Text</h3>
          <button onClick={onClose} className="p-2 rounded hover:bg-gray-100">
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>
        <div className="p-4 space-y-4 overflow-y-auto">
          <p className="text-sm text-gray-600">Edit the generated review suggestion below. You can save changes and later send the suggestion, or save & queue immediately.</p>
          <textarea
            className="w-full h-64 border rounded-md p-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none bg-gray-50"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="AI generated review text will appear here"
          />
          {error && <div className="text-sm text-red-600">{error}</div>}
          {savedMessage && <div className="text-sm text-green-600">{savedMessage}</div>}
        </div>
        <div className="p-4 border-t bg-gray-50 flex justify-end space-x-3 rounded-b-xl">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            disabled={isSaving || isQueuing}
          >
            Close
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving || isQueuing}
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-md disabled:opacity-50"
          >
            {isSaving ? (
              <>
                <div className="h-4 w-4 mr-2 animate-spin rounded-full border-b-2 border-white"></div>
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save
              </>
            )}
          </button>
          {onQueueSuggestion && (
            <button
              onClick={handleSaveAndQueue}
              disabled={isSaving || isQueuing}
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-md disabled:opacity-50"
            >
              {isQueuing ? (
                <>
                  <div className="h-4 w-4 mr-2 animate-spin rounded-full border-b-2 border-white"></div>
                  Queuing...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Save & Queue Suggestion
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
