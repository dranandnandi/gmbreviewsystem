import React, { useState } from 'react';
import { format } from 'date-fns';
import { MessageCircle, Eye, Edit3, Save, X, CheckCircle, Zap } from 'lucide-react';
import { useStore } from '../store/useStore';
import { MessageModal } from './MessageModal';
import { generateWhatsAppLink } from '../utils/whatsappUtils';
import type { SequenceMessage } from '../types';

interface MessageCardProps {
  message: SequenceMessage;
}

export function MessageCard({ message }: MessageCardProps) {
  const { user, updateSequenceMessageContent, updateSequenceMessageStatus } = useStore();
  const [sendingDirectMessage, setSendingDirectMessage] = useState(false);
  const [showFullMessageModal, setShowFullMessageModal] = useState(false);
  const [messageToDisplay, setMessageToDisplay] = useState<SequenceMessage | null>(null);
  const [editingMessageContent, setEditingMessageContent] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleManualSend = () => {
    const whatsappLink = generateWhatsAppLink(message.messageContent, message.whatsappNumber);
    window.open(whatsappLink, '_blank');
  };

  const handleDirectSend = async () => {
    if (!user?.blueticksApiKey) {
      setError('Blueticks API key not configured. Please add your API key in Settings first.');
      return;
    }

    setSendingDirectMessage(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch("https://api.blueticks.co/messages", {
        method: "POST",
        headers: { 
          "content-type": "application/json" 
        },
        body: JSON.stringify({
          apiKey: user.blueticksApiKey,
          to: `+91${message.whatsappNumber}`,
          message: message.messageContent,
        }),
      });

      if (response.ok) {
        await updateSequenceMessageStatus(message.id, 'sent');
        setSuccess(`Message sent directly to ${message.patientName}!`);
        setTimeout(() => setSuccess(''), 3000);
      } else {
        const error = await response.text();
        throw new Error(`Failed to send message: ${error}`);
      }
    } catch (error) {
      console.error('Error sending direct message:', error);
      setError(error instanceof Error ? error.message : 'Failed to send message directly');
    } finally {
      setSendingDirectMessage(false);
    }
  };

  const handleEditMessage = () => {
    setIsEditing(true);
    setEditingMessageContent(message.messageContent);
  };

  const handleSaveEditedMessage = async () => {
    try {
      await updateSequenceMessageContent(message.id, editingMessageContent);
      setIsEditing(false);
      setEditingMessageContent('');
      setSuccess('Message updated successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      console.error('Error updating message:', error);
      setError('Failed to update message. Please try again.');
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditingMessageContent('');
  };

  const handleViewMessage = () => {
    setMessageToDisplay(message);
    setShowFullMessageModal(true);
  };
  
  return (
    <>
      <div className="bg-white border rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
        {/* Status Messages */}
        {error && (
          <div className="mb-3 rounded-md bg-red-50 p-2">
            <div className="text-xs text-red-700">{error}</div>
          </div>
        )}

        {success && (
          <div className="mb-3 rounded-md bg-green-50 p-2">
            <div className="text-xs text-green-700">{success}</div>
          </div>
        )}

        <div className="flex items-start space-x-3">
          {/* Content */}
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-2">
              <h3 className="font-medium text-gray-900">{message.patientName}</h3>
              <span className="text-sm text-gray-500">
                {format(new Date(message.scheduledDate), 'MMM dd, yyyy')}
              </span>
            </div>
            
            <p className="text-sm text-gray-600 mb-2">
              📱 {message.whatsappNumber}
            </p>
            
            <div className="bg-gray-50 p-3 rounded-md mb-3">
              {isEditing ? (
                <textarea
                  value={editingMessageContent}
                  onChange={(e) => setEditingMessageContent(e.target.value)}
                  rows={6}
                  className="w-full text-sm border-gray-300 rounded-md focus:border-indigo-500 focus:ring-indigo-500"
                  placeholder="Edit message content..."
                />
              ) : (
                <p className="text-sm text-gray-700 whitespace-pre-wrap">
                  {message.messageContent.length > 150 
                    ? `${message.messageContent.substring(0, 150)}...` 
                    : message.messageContent}
                </p>
              )}
            </div>
          </div>
          
          {/* Action Buttons */}
          <div className="flex flex-col space-y-2">
            {isEditing ? (
              <>
                <button
                  onClick={handleSaveEditedMessage}
                  className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded-md text-white bg-green-600 hover:bg-green-700 transition-colors"
                  title="Save changes"
                >
                  <Save className="h-3 w-3 mr-1" />
                  Save
                </button>
                <button
                  onClick={handleCancelEdit}
                  className="inline-flex items-center px-3 py-1 border border-gray-300 text-xs font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 transition-colors"
                  title="Cancel editing"
                >
                  <X className="h-3 w-3 mr-1" />
                  Cancel
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={handleViewMessage}
                  className="inline-flex items-center px-3 py-1 border border-gray-300 text-xs font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 transition-colors"
                  title="View full message"
                >
                  <Eye className="h-3 w-3 mr-1" />
                  View
                </button>

                <button
                  onClick={handleEditMessage}
                  className="inline-flex items-center px-3 py-1 border border-gray-300 text-xs font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 transition-colors"
                  title="Edit message content"
                >
                  <Edit3 className="h-3 w-3 mr-1" />
                  Edit
                </button>

                <button
                  onClick={handleManualSend}
                  className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 transition-colors"
                  title="Send manually via web.whatsapp.com"
                >
                  <MessageCircle className="h-3 w-3 mr-1" />
                  Send Manually
                </button>

                <button
                  onClick={handleDirectSend}
                  disabled={sendingDirectMessage || !user?.blueticksApiKey}
                  className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  title={!user?.blueticksApiKey ? 'Configure Blueticks API key in Settings first' : 'Send directly via Blueticks API'}
                >
                  {sendingDirectMessage ? (
                    <>
                      <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-1"></div>
                      ...
                    </>
                  ) : (
                    <>
                      <Zap className="h-3 w-3 mr-1" />
                      Send Directly
                    </>
                  )}
                </button>
              </>
            )}
          </div>
        </div>
        
        {/* Mark as Sent Button - Always visible for pending/failed messages */}
        {!isEditing && (message.status === 'pending' || message.status === 'failed') && (
          <div className="mt-3 pt-3 border-t border-gray-200">
            <button
              onClick={() => updateSequenceMessageStatus(message.id, 'sent')}
              className="w-full inline-flex items-center justify-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-emerald-600 hover:bg-emerald-700 transition-colors shadow-sm"
              title="Mark this message as sent after sending manually via web.whatsapp.com"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Mark as Sent
            </button>
          </div>
        )}
      </div>

      {/* Message Modal */}
      {showFullMessageModal && messageToDisplay && (
        <MessageModal 
          message={messageToDisplay} 
          onClose={() => {
            setShowFullMessageModal(false);
            setMessageToDisplay(null);
          }} 
        />
      )}
    </>
  );
}