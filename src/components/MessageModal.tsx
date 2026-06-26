import React, { useState } from 'react';
import { X, Send } from 'lucide-react';
import { format } from 'date-fns';
import { whatsappApi } from '../services/whatsappApi';
import { useStore } from '../store/useStore';

interface MessageModalProps {
  message: {
    messageContent: string;
    patientName: string;
    scheduledDate: string;
    contactNumber?: string;
  } | null;
  onClose: () => void;
}

export const MessageModal: React.FC<MessageModalProps> = ({ message, onClose }) => {
  const { user } = useStore();
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!message) return null;

  const handleSendWhatsApp = async () => {
    if (!message.contactNumber || !user?.id) {
      setError('Contact number or user ID not available');
      return;
    }

    try {
      setSending(true);
      setError(null);

      await whatsappApi.sendMessage(
        {
          phone: message.contactNumber,
          message: message.messageContent,
          metadata: {
            patientName: message.patientName,
            scheduledDate: message.scheduledDate,
            sentFrom: 'MessageModal'
          }
        },
        { userId: user.id }
      );

      setSent(true);
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err: any) {
      console.error('Failed to send WhatsApp message:', err);
      setError(err.message || 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto relative">
        <div className="p-4 border-b flex justify-between items-center">
          <h3 className="text-lg font-semibold">Message Details</h3>
          <button 
            onClick={onClose} 
            className="p-1 hover:bg-gray-100 rounded absolute top-4 right-4"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-4 space-y-4">
          <div>
            <p className="text-sm font-medium text-gray-500">Patient</p>
            <p className="text-base">{message.patientName}</p>
          </div>
          {message.contactNumber && (
            <div>
              <p className="text-sm font-medium text-gray-500">Contact Number</p>
              <p className="text-base">{message.contactNumber}</p>
            </div>
          )}
          <div>
            <p className="text-sm font-medium text-gray-500">Scheduled Date</p>
            <p className="text-base">{format(new Date(message.scheduledDate), 'PP')}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Message Content</p>
            <div className="mt-2 p-4 bg-gray-50 rounded-lg whitespace-pre-wrap text-base">
              {message.messageContent}
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
              {error}
            </div>
          )}

          {/* Success Message */}
          {sent && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-md text-green-700 text-sm">
              ✓ Message sent successfully via WhatsApp!
            </div>
          )}

          {/* Send WhatsApp Button */}
          {message.contactNumber && !sent && (
            <div className="pt-2">
              <button
                onClick={handleSendWhatsApp}
                disabled={sending}
                className="w-full inline-flex items-center justify-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {sending ? (
                  <>
                    <div className="h-4 w-4 mr-2 animate-spin rounded-full border-b-2 border-white" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Send via WhatsApp
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};