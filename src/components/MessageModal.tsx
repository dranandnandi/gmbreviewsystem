import React from 'react';
import { X } from 'lucide-react';
import { format } from 'date-fns';

interface MessageModalProps {
  message: {
    messageContent: string;
    patientName: string;
    scheduledDate: string;
  } | null;
  onClose: () => void;
}

export const MessageModal: React.FC<MessageModalProps> = ({ message, onClose }) => {
  if (!message) return null;

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
        </div>
      </div>
    </div>
  );
};