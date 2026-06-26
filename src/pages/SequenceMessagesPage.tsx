import React, { useEffect, useState } from 'react';
import { useStore } from '../store/useStore';
import { format, isToday, isPast, addDays, isTomorrow } from 'date-fns';
import { MessageCircle, RefreshCw, Trash2, Filter, Calendar, X, Eye, AlertCircle, CheckSquare, Square, Send } from 'lucide-react';
import { MessageModal } from '../components/MessageModal';
import { whatsappApi } from '../services/whatsappApi';

export function SequenceMessagesPage() {
  const { 
    user, 
    sequenceMessages, 
    updateSequenceMessageStatus, 
    deleteSequenceMessage, 
    lazyLoadSequenceMessages,
    isLoadingSequenceMessages
  } = useStore();
  const [selectedPatient, setSelectedPatient] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [selectedMessage, setSelectedMessage] = useState<typeof sequenceMessages[0] | null>(null);
  const [selectedMessageIds, setSelectedMessageIds] = useState<Set<string>>(new Set());
  const [sendingDirectMessage, setSendingDirectMessage] = useState<string | null>(null);

  useEffect(() => {
    if (user?.id) {
      lazyLoadSequenceMessages();
    }
  }, [user?.id, lazyLoadSequenceMessages]);

  const patients = Array.from(new Set(sequenceMessages.map(m => m.patientName))).sort();

  const filterMessages = (messages: typeof sequenceMessages) => {
    let filtered = messages;

    // Filter by patient
    if (selectedPatient) {
      filtered = filtered.filter(m => m.patientName === selectedPatient);
    }

    // Filter by date
    if (selectedDate) {
      filtered = filtered.filter(m => {
        const messageDate = new Date(m.scheduledDate);
        switch (selectedDate) {
          case 'today':
            return isToday(messageDate);
          case 'overdue':
            return isPast(messageDate) && !isToday(messageDate);
          case 'tomorrow':
            return isTomorrow(messageDate);
          case 'future':
            return messageDate > addDays(new Date(), 1);
          default:
            return true;
        }
      });
    }

    // Filter by status
    if (selectedStatus) {
      filtered = filtered.filter(m => m.status === selectedStatus);
    }

    return filtered;
  };

  const filteredMessages = filterMessages(sequenceMessages);

  // Handle select all checkbox
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const filteredIds = new Set(filteredMessages.map(m => m.id));
      setSelectedMessageIds(filteredIds);
    } else {
      setSelectedMessageIds(new Set());
    }
  };

  // Handle individual message selection
  const handleMessageSelect = (messageId: string, checked: boolean) => {
    const newSelected = new Set(selectedMessageIds);
    if (checked) {
      newSelected.add(messageId);
    } else {
      newSelected.delete(messageId);
    }
    setSelectedMessageIds(newSelected);
  };

  // Check if all filtered messages are selected
  const allFilteredSelected = filteredMessages.length > 0 && 
    filteredMessages.every(m => selectedMessageIds.has(m.id));

  // Check if some (but not all) filtered messages are selected
  const someFilteredSelected = filteredMessages.some(m => selectedMessageIds.has(m.id)) && 
    !allFilteredSelected;

  const generateWhatsAppLink = (message: string, phoneNumber: string) => {
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    const baseUrl = isMobile ? 'whatsapp://' : 'https://web.whatsapp.com/';
    const formattedPhone = `91${phoneNumber}`;
    return `${baseUrl}send?phone=${formattedPhone}&text=${encodeURIComponent(message)}`;
  };

  const handleSendMessage = async (message: typeof sequenceMessages[0]) => {
    try {
      window.open(generateWhatsAppLink(message.messageContent, message.whatsappNumber), '_blank');
      updateSequenceMessageStatus(message.id, 'sent');
    } catch (error) {
      console.error('Error sending message:', error);
      updateSequenceMessageStatus(message.id, 'failed');
    }
  };

  const handleRetry = (message: typeof sequenceMessages[0]) => {
    updateSequenceMessageStatus(message.id, 'pending');
  };

  const sendDirectWhatsApp = async (message: typeof sequenceMessages[0]) => {
    if (!user?.id) {
      alert('User not authenticated');
      return;
    }

    setSendingDirectMessage(message.id);
    
    try {
      await whatsappApi.sendMessage(
        {
          phone: message.whatsappNumber,
          message: message.messageContent,
        },
        {
          userId: user.id,
          labContext: 'sequence_message'
        }
      );

      await updateSequenceMessageStatus(message.id, 'sent');
      alert(`Message sent successfully to ${message.patientName}!`);
    } catch (error) {
      console.error('Error sending direct WhatsApp message:', error);
      await updateSequenceMessageStatus(message.id, 'failed');
      alert(`Failed to send message: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setSendingDirectMessage(null);
    }
  };

  

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold text-gray-900 flex items-center">
          <Calendar className="h-6 w-6 mr-2 text-indigo-600" />
          Sequence Messages
        </h1>
      </div>

      <div className="bg-white p-4 rounded-lg shadow flex flex-wrap gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            <Filter className="h-4 w-4 inline-block mr-1" />
            Filter by Patient
          </label>
          <select
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            value={selectedPatient}
            onChange={(e) => setSelectedPatient(e.target.value)}
          >
            <option value="">All Patients</option>
            {patients.map(patient => (
              <option key={patient} value={patient}>{patient}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            <Calendar className="h-4 w-4 inline-block mr-1" />
            Filter by Date
          </label>
          <select
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
          >
            <option value="">All Dates</option>
            <option value="today">Due Today</option>
            <option value="overdue">Overdue</option>
            <option value="tomorrow">Due Tomorrow</option>
            <option value="future">Future Messages</option>
          </select>
          <p className="mt-1 text-xs text-gray-500">
            {selectedDate === 'today' && 'Showing messages due today'}
            {selectedDate === 'overdue' && 'Showing overdue messages'}
            {selectedDate === 'tomorrow' && 'Showing messages due tomorrow'}
            {selectedDate === 'future' && 'Showing future messages'}
            {!selectedDate && 'Showing all messages'}
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            <Filter className="h-4 w-4 inline-block mr-1" />
            Filter by Status
          </label>
          <select
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
          >
            <option value="">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="sent">Sent</option>
            <option value="failed">Failed</option>
          </select>
          <p className="mt-1 text-xs text-gray-500">
            {selectedStatus === 'pending' && 'Showing pending messages'}
            {selectedStatus === 'sent' && 'Showing sent messages'}
            {selectedStatus === 'failed' && 'Showing failed messages'}
            {!selectedStatus && 'Showing all statuses'}
          </p>
        </div>
      </div>

      

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="overflow-x-auto -mx-4 sm:mx-0">
          {isLoadingSequenceMessages ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
              <span className="ml-2 text-gray-600">Loading messages...</span>
            </div>
          ) : (
            filteredMessages.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                No messages found for the selected filters
              </div>
            ) : (
              <table className="min-w-full divide-y divide-gray-200 table-fixed">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-12">
                      <button
                        onClick={() => handleSelectAll(!allFilteredSelected)}
                        className="flex items-center justify-center w-full h-full"
                      >
                        {allFilteredSelected ? (
                          <CheckSquare className="h-4 w-4 text-indigo-600" />
                        ) : someFilteredSelected ? (
                          <div className="h-4 w-4 bg-indigo-600 rounded-sm flex items-center justify-center">
                            <div className="h-2 w-2 bg-white rounded-sm"></div>
                          </div>
                        ) : (
                          <Square className="h-4 w-4 text-gray-400" />
                        )}
                      </button>
                    </th>
                    <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/5">
                      Patient Name
                    </th>
                    <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/6">
                      WhatsApp Number
                    </th>
                    <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/6">
                      Scheduled Date
                    </th>
                    <th className="hidden sm:table-cell px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/4">
                      Message
                    </th>
                    <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/6">
                      Status
                    </th>
                    <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/6">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredMessages.map((message) => (
                    <tr key={message.id}>
                      <td className="px-4 sm:px-6 py-4 text-sm">
                        <button
                          onClick={() => handleMessageSelect(message.id, !selectedMessageIds.has(message.id))}
                          className="flex items-center justify-center w-full h-full"
                        >
                          {selectedMessageIds.has(message.id) ? (
                            <CheckSquare className="h-4 w-4 text-indigo-600" />
                          ) : (
                            <Square className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                          )}
                        </button>
                      </td>
                      <td className="px-4 sm:px-6 py-4 text-sm text-gray-900 truncate">
                        {message.patientName}
                      </td>
                      <td className="px-4 sm:px-6 py-4 text-sm text-gray-500 truncate">
                        {message.whatsappNumber}
                      </td>
                      <td className="px-4 sm:px-6 py-4 text-sm text-gray-500 truncate">
                        <span className="inline-block">
                          {format(new Date(message.scheduledDate), 'PP')}
                        </span>
                      </td>
                      <td
                        className="hidden sm:table-cell px-4 sm:px-6 py-4 text-sm text-gray-500 group relative"
                      >
                        <div className="max-w-xs truncate group-hover:text-indigo-600">
                          {message.messageContent}
                        </div>
                        <button
                          onClick={() => setSelectedMessage(message)}
                          className="absolute inset-0 w-full h-full opacity-0 group-hover:opacity-100 flex items-center justify-center bg-gray-50 bg-opacity-50"
                        >
                          <Eye className="h-5 w-5 text-indigo-600" />
                        </button>
                      </td>
                      <td className="px-4 sm:px-6 py-4 text-sm">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          message.status === 'sent'
                            ? 'bg-green-100 text-green-800'
                            : message.status === 'failed'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {message.status}
                        </span>
                      </td>
                      <td className="px-4 sm:px-6 py-4 text-sm text-gray-500 space-x-2 flex items-center">
                        <button
                          onClick={() => setSelectedMessage(message)}
                          className="sm:hidden text-indigo-600 hover:text-indigo-900"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        {message.status !== 'sent' && (
                          <>
                            <button
                              onClick={() => handleSendMessage(message)}
                              className="text-green-600 hover:text-green-900"
                              title="Send Manually via WhatsApp"
                            >
                              <MessageCircle className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => sendDirectWhatsApp(message)}
                              disabled={sendingDirectMessage === message.id}
                              className="text-blue-600 hover:text-blue-900 disabled:opacity-50 disabled:cursor-not-allowed"
                              title="Send Directly via WhatsApp API"
                            >
                              {sendingDirectMessage === message.id ? (
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                              ) : (
                                <Send className="h-4 w-4" />
                              )}
                            </button>
                          </>
                        )}
                        {message.status === 'failed' && (
                          <button
                            onClick={() => handleRetry(message)}
                            className="text-yellow-600 hover:text-yellow-900"
                          >
                            <RefreshCw className="h-4 w-4" />
                          </button>
                        )}
                        <button
                          onClick={() => deleteSequenceMessage(message.id)}
                          className="text-red-600 hover:text-red-900 ml-2"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )
          )}
        </div>
        {selectedMessage && <MessageModal message={selectedMessage} onClose={() => setSelectedMessage(null)} />}
      </div>
    </div>
  );
}