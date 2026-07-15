import React, { useEffect, useState } from 'react';
import { useStore } from '../store/useStore';
import { format, isToday, isPast } from 'date-fns';
import { Calendar, Clock, Send, AlertCircle, CheckCircle, RefreshCw, CheckSquare, Square } from 'lucide-react';
import { MessageCard } from '../components/MessageCard';
import { whatsappApi } from '../services/whatsappApi';
import { WhatsAppStatusIndicator } from '../components/WhatsApp/WhatsAppStatusIndicator';
import type { SequenceMessage } from '../types';

export function SimplifiedSequenceMessagesPage() {
  const { user, sequenceMessages, fetchSequenceMessages, updateSequenceMessageStatus } = useStore();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isBulkSending, setIsBulkSending] = useState(false);
  const [selectedDueTodayIds, setSelectedDueTodayIds] = useState<Set<string>>(new Set());
  const [selectedOverdueIds, setSelectedOverdueIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');

  useEffect(() => {
    fetchSequenceMessages();
  }, [fetchSequenceMessages]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await fetchSequenceMessages();
    } finally {
      setIsRefreshing(false);
    }
  };

  // Filter only pending messages
  const pendingMessages = sequenceMessages.filter(message => message.status === 'pending');

  // Categorize messages
  const dueTodayMessages = pendingMessages.filter(message => 
    isToday(new Date(message.scheduledDate))
  ).sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()); // Sort oldest first

  const overdueMessages = pendingMessages.filter(message => {
    const messageDate = new Date(message.scheduledDate);
    return isPast(messageDate) && !isToday(messageDate);
  }).sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()); // Sort oldest first

  const handleSelectAll = (section: 'dueToday' | 'overdue', checked: boolean) => {
    if (section === 'dueToday') {
      if (checked) {
        setSelectedDueTodayIds(new Set(dueTodayMessages.map(m => m.id)));
      } else {
        setSelectedDueTodayIds(new Set());
      }
    } else {
      if (checked) {
        setSelectedOverdueIds(new Set(overdueMessages.map(m => m.id)));
      } else {
        setSelectedOverdueIds(new Set());
      }
    }
  };

  const handleMessageSelect = (messageId: string, section: 'dueToday' | 'overdue', checked: boolean) => {
    if (section === 'dueToday') {
      const newSelected = new Set(selectedDueTodayIds);
      if (checked) {
        newSelected.add(messageId);
      } else {
        newSelected.delete(messageId);
      }
      setSelectedDueTodayIds(newSelected);
    } else {
      const newSelected = new Set(selectedOverdueIds);
      if (checked) {
        newSelected.add(messageId);
      } else {
        newSelected.delete(messageId);
      }
      setSelectedOverdueIds(newSelected);
    }
  };

  const handleBulkSendViaWhatsApp = async (section: 'dueToday' | 'overdue') => {
    if (!user?.id) {
      setError('Please login before sending WhatsApp messages.');
      return;
    }

    const selectedIds = section === 'dueToday' ? selectedDueTodayIds : selectedOverdueIds;
    if (selectedIds.size === 0) {
      setError('Please select at least one message to send.');
      return;
    }

    const selectedMessages = sequenceMessages.filter(m => selectedIds.has(m.id));
    
    setError('');
    setSuccess('');
    setIsBulkSending(true);

    try {
      const failedMessages: string[] = [];

      for (const message of selectedMessages) {
        try {
          await whatsappApi.sendMessage(
            {
              phone: message.whatsappNumber,
              message: message.messageContent,
              metadata: {
                sequenceMessageId: message.id,
                patientName: message.patientName,
                scheduledDate: message.scheduledDate,
                sentFrom: 'QuickSendBulk',
              },
            },
            { userId: user.id }
          );
          await updateSequenceMessageStatus(message.id, 'sent');
        } catch (sendError) {
          console.error('Error sending WhatsApp sequence message:', sendError);
          failedMessages.push(message.patientName || message.whatsappNumber);
        }
      }

      const sentCount = selectedMessages.length - failedMessages.length;

      if (sentCount > 0) {
        setSuccess(`${sentCount} message${sentCount > 1 ? 's' : ''} sent via WhatsApp.`);
      }

      if (failedMessages.length > 0) {
        setError(`Could not send ${failedMessages.length} message${failedMessages.length > 1 ? 's' : ''}: ${failedMessages.join(', ')}`);
      }
      
      // Clear selection
      if (section === 'dueToday') {
        setSelectedDueTodayIds(new Set());
      } else {
        setSelectedOverdueIds(new Set());
      }
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      console.error('Error sending messages via WhatsApp:', error);
      setError(error instanceof Error ? error.message : 'Failed to send WhatsApp messages');
    } finally {
      setIsBulkSending(false);
    }
  };

  const MessageCardWithSelection = ({ 
    message, 
    section, 
    isSelected, 
    onSelect 
  }: { 
    message: SequenceMessage; 
    section: 'dueToday' | 'overdue';
    isSelected: boolean;
    onSelect: (checked: boolean) => void;
  }) => {
    
    return (
      <div className="flex items-start space-x-3">
        {/* Checkbox */}
        <button
          onClick={() => onSelect(!isSelected)}
          className="flex items-center justify-center mt-1"
        >
          {isSelected ? (
            <CheckSquare className="h-5 w-5 text-indigo-600" />
          ) : (
            <Square className="h-5 w-5 text-gray-400 hover:text-gray-600" />
          )}
        </button>

        {/* Message Card */}
        <div className="flex-1">
          <MessageCard message={message} />
        </div>
      </div>
    );
  };

  const MessageCardOld = ({ 
    message, 
    section, 
    isSelected, 
    onSelect 
  }: { 
    message: SequenceMessage; 
    section: 'dueToday' | 'overdue';
    isSelected: boolean;
    onSelect: (checked: boolean) => void;
  }) => {
    
    return (
      <div className="bg-white border rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
        <div className="flex items-start space-x-3">
          {/* Checkbox */}
          <button
            onClick={() => onSelect(!isSelected)}
            className="flex items-center justify-center mt-1"
          >
            {isSelected ? (
              <CheckSquare className="h-5 w-5 text-indigo-600" />
            ) : (
              <Square className="h-5 w-5 text-gray-400 hover:text-gray-600" />
            )}
          </button>

        <MessageCard message={message} />
        </div>
      </div>
    );
  };

  const SectionHeader = ({ 
    title, 
    count, 
    icon: Icon, 
    color,
    section,
    selectedCount,
    allSelected,
    someSelected,
    onSelectAll,
    onBulkSend
  }: { 
    title: string; 
    count: number; 
    icon: React.ComponentType<{ className?: string }>; 
    color: string;
    section: 'dueToday' | 'overdue';
    selectedCount: number;
    allSelected: boolean;
    someSelected: boolean;
    onSelectAll: (checked: boolean) => void;
    onBulkSend: () => void;
  }) => (
    <div className={`flex items-center justify-between p-3 rounded-lg ${color} mb-4`}>
      <div className="flex items-center space-x-3">
        <Icon className="h-5 w-5" />
        <h2 className="text-lg font-semibold">{title}</h2>
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-white bg-opacity-80">
          {count} message{count !== 1 ? 's' : ''}
        </span>
      </div>

      {count > 0 && (
        <div className="flex items-center space-x-3">
          {/* Select All Checkbox */}
          <label className="flex items-center space-x-2 text-sm font-medium cursor-pointer">
            <button
              onClick={() => onSelectAll(!allSelected)}
              className="flex items-center justify-center"
            >
              {allSelected ? (
                <CheckSquare className="h-4 w-4 text-indigo-600" />
              ) : someSelected ? (
                <div className="h-4 w-4 bg-indigo-600 rounded-sm flex items-center justify-center">
                  <div className="h-2 w-2 bg-white rounded-sm"></div>
                </div>
              ) : (
                <Square className="h-4 w-4 text-gray-400 hover:text-gray-600" />
              )}
            </button>
            <span>Select All</span>
          </label>

          {/* Send Selected Button */}
          {selectedCount > 0 && (
            <button
              onClick={onBulkSend}
              disabled={isBulkSending}
              className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isBulkSending ? <RefreshCw className="h-4 w-4 mr-1 animate-spin" /> : <Send className="h-4 w-4 mr-1" />}
              Send via WhatsApp ({selectedCount})
            </button>
          )}
        </div>
      )}
    </div>
  );

  // Calculate selection states
  const dueTodayAllSelected = dueTodayMessages.length > 0 && dueTodayMessages.every(m => selectedDueTodayIds.has(m.id));
  const dueTodaySomeSelected = dueTodayMessages.some(m => selectedDueTodayIds.has(m.id)) && !dueTodayAllSelected;

  const overdueAllSelected = overdueMessages.length > 0 && overdueMessages.every(m => selectedOverdueIds.has(m.id));
  const overdueSomeSelected = overdueMessages.some(m => selectedOverdueIds.has(m.id)) && !overdueAllSelected;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <Send className="h-8 w-8 text-green-600 mr-3" />
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Quick Send</h1>
            <p className="text-gray-600">Send pending sequence messages</p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <WhatsAppStatusIndicator showLabel={true} size="sm" />
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            {isRefreshing ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Status Messages */}
      {error && (
        <div className="rounded-md bg-red-50 p-4">
          <div className="flex">
            <AlertCircle className="h-5 w-5 text-red-400 mr-2" />
            <div className="text-sm text-red-700">{error}</div>
          </div>
        </div>
      )}

      {success && (
        <div className="rounded-md bg-green-50 p-4">
          <div className="flex">
            <CheckCircle className="h-5 w-5 text-green-400 mr-2" />
            <div className="text-sm text-green-700">{success}</div>
          </div>
        </div>
      )}

      {/* Due Today Section */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6">
          <SectionHeader 
            title="Due Today" 
            count={dueTodayMessages.length}
            icon={Clock}
            color="bg-blue-50 text-blue-800"
            section="dueToday"
            selectedCount={selectedDueTodayIds.size}
            allSelected={dueTodayAllSelected}
            someSelected={dueTodaySomeSelected}
            onSelectAll={(checked) => handleSelectAll('dueToday', checked)}
            onBulkSend={() => handleBulkSendViaWhatsApp('dueToday')}
          />
          
          {dueTodayMessages.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Clock className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p>No messages due today</p>
            </div>
          ) : (
            <div className="space-y-4">
              {dueTodayMessages.map((message) => (
                <MessageCardWithSelection 
                  key={message.id} 
                  message={message} 
                  section="dueToday"
                  isSelected={selectedDueTodayIds.has(message.id)}
                  onSelect={(checked) => handleMessageSelect(message.id, 'dueToday', checked)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Overdue Section */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6">
          <SectionHeader 
            title="Overdue" 
            count={overdueMessages.length}
            icon={AlertCircle}
            color="bg-red-50 text-red-800"
            section="overdue"
            selectedCount={selectedOverdueIds.size}
            allSelected={overdueAllSelected}
            someSelected={overdueSomeSelected}
            onSelectAll={(checked) => handleSelectAll('overdue', checked)}
            onBulkSend={() => handleBulkSendViaWhatsApp('overdue')}
          />
          
          {overdueMessages.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <CheckCircle className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p>No overdue messages</p>
            </div>
          ) : (
            <div className="space-y-4">
              {overdueMessages.map((message) => (
                <MessageCardWithSelection 
                  key={message.id} 
                  message={message} 
                  section="overdue"
                  isSelected={selectedOverdueIds.has(message.id)}
                  onSelect={(checked) => handleMessageSelect(message.id, 'overdue', checked)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Summary */}
      <div className="bg-gray-50 rounded-lg p-4">
        <div className="flex items-center justify-between text-sm text-gray-600">
          <span>
            Total pending messages: {pendingMessages.length}
          </span>
          <span>
            Ready to send: {dueTodayMessages.length + overdueMessages.length}
          </span>
        </div>
      </div>

    </div>
  );
}
