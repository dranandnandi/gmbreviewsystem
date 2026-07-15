import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import { format, addDays } from 'date-fns';
import { generateReviewMessageContent } from '../utils/messageGeneration';
import { MessageCircle, Clock, Pencil, Star } from 'lucide-react';
import { SequenceOptionsModal } from '../components/SequenceOptionsModal';
import { BulkCreateSequenceModal } from '../components/BulkCreateSequenceModal';
import { InteractiveStatusBadge } from '../components/InteractiveStatusBadge';
import { ReviewActionsDropdown } from '../components/ReviewActionsDropdown';
import { AIReviewEditorModal } from '../components/AIReviewEditorModal';
import { ReviewCard } from '../components/ReviewCard';
import { SendMessagesModal } from '../components/SendMessagesModal';
import { getRandomizedSequenceDays } from '../utils/dateUtils';
import { toTitleCase } from '../utils/stringUtils';
import { CheckSquare, Square } from 'lucide-react';
import { EditReviewModal } from '../components/EditReviewModal';
import { WhatsAppStatusIndicator } from '../components/WhatsApp/WhatsAppStatusIndicator';

const LANGUAGE_NAMES: Record<string, string> = {
  en: 'English',
  hi: 'Hindi',
  gu: 'Gujarati',
  mr: 'Marathi'
};

export function ReviewsPage() {
  const { 
    user, 
    reviews, 
    lazyLoadReviews,
    fetchReviews,
    isLoadingReviews,
    reviewRequestTemplates,
    isLoadingReviewRequestTemplates,
    fetchReviewRequestTemplates,
    addReview, 
    updateReviewStatus, 
    updateReviewAiReviewText,
    updateReviewAiFirstMessageStatus,
    sequenceTemplates, 
    addSequenceMessage, 
    fetchSequenceMessages,
    fetchSequenceTemplates,
    queueReviewMessageForSheet,
    updateReviewFields,
    deleteReview
  } = useStore();
  
  // Add logging for template state
  React.useEffect(() => {
    console.log('[REVIEWS PAGE] Template state changed:', {
      isLoadingReviewRequestTemplates,
      reviewRequestTemplatesCount: reviewRequestTemplates.length,
      reviewRequestTemplates
    });
  }, [isLoadingReviewRequestTemplates, reviewRequestTemplates]);
  
  const [formData, setFormData] = useState({
    patientName: '',
    appointmentDate: '',
    contactNumber: '',
    treatment: '',
    notes: '',
  });

  // Modal state
  const [showSequenceOptionsModal, setShowSequenceOptionsModal] = useState(false);
  const [selectedReviewForSequence, setSelectedReviewForSequence] = useState<typeof reviews[0] | null>(null);
  
  // Send Messages Modal state
  const [showSendMessagesModal, setShowSendMessagesModal] = useState(false);
  const [selectedReviewForMessages, setSelectedReviewForMessages] = useState<typeof reviews[0] | null>(null);
  const [isSendingMessages, setIsSendingMessages] = useState(false);
  const [isDirectSendingMessages, setIsDirectSendingMessages] = useState(false);
  
  // Bulk sequence creation state
  const [selectedReviewIds, setSelectedReviewIds] = useState<Set<string>>(new Set());
  const [showBulkCreateSequenceModal, setShowBulkCreateSequenceModal] = useState(false);
  const [isCreatingBulkSequence, setIsCreatingBulkSequence] = useState(false);

  // AI Review Editor Modal state
  const [showAIReviewEditor, setShowAIReviewEditor] = useState(false);
  const [selectedReviewForAIEdit, setSelectedReviewForAIEdit] = useState<typeof reviews[0] | null>(null);
  const [isQueuingAISuggestion, setIsQueuingAISuggestion] = useState(false);
  const [isGeneratingAIReview, setIsGeneratingAIReview] = useState(false);
  // Edit Review modal state
  const [showEditReviewModal, setShowEditReviewModal] = useState(false);
  const [selectedReviewForEdit, setSelectedReviewForEdit] = useState<typeof reviews[0] | null>(null);

  // Success and error messages for queuing
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  React.useEffect(() => {
    // Lazy load reviews when page mounts
    if (user?.id) {
      lazyLoadReviews();
      // Also ensure review request templates are loaded
      fetchReviewRequestTemplates();
    }
  }, [user?.id, lazyLoadReviews]);

  // Separate effect to fetch templates when component mounts
  React.useEffect(() => {
    if (user?.id) {
      fetchReviewRequestTemplates();
    }
  }, [user?.id, fetchReviewRequestTemplates]);
  
  // Clear messages after 5 seconds
  React.useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(''), 5000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);
  
  React.useEffect(() => {
    if (errorMessage) {
      const timer = setTimeout(() => setErrorMessage(''), 5000);
      return () => clearTimeout(timer);
    }
  }, [errorMessage]);
  
  const isValidDate = (date: any) => {
    return date && !isNaN(new Date(date).getTime());
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const formattedDate = isValidDate(formData.appointmentDate)
      ? new Date(formData.appointmentDate).toISOString()
      : new Date().toISOString();

    try {
      const review = {
        id: crypto.randomUUID(),
        userId: user?.id || '',
        patientName: toTitleCase(formData.patientName),
        appointmentDate: formattedDate,
        contactNumber: formData.contactNumber,
        treatment: formData.treatment,
        notes: formData.notes,
        status: 'pending' as const,
        hasSequence: false,
        aiReviewText: undefined,
        aiReviewFirstMessageSent: false,
        createdAt: new Date().toISOString(),
      };

      await addReview(review);

      // Reset form after successful submission
      setFormData({
        patientName: '',
        appointmentDate: '',
        contactNumber: '',
        treatment: '',
        notes: '',
      });
    } catch (error) {
      console.error('Error adding review:', error);
      alert('An error occurred while adding the review. Please try again.');
    }
  };

  const handleOpenSendMessagesModal = (review: typeof reviews[0]) => {
    setSelectedReviewForMessages(review);
    setShowSendMessagesModal(true);
  };

  const handleOpenAIReviewEditor = async (review: typeof reviews[0]) => {
    // If AI text already exists, just open the modal
    if (review.aiReviewText) {
      setSelectedReviewForAIEdit(review);
      setShowAIReviewEditor(true);
      return;
    }
    // Otherwise generate first
    try {
      setIsGeneratingAIReview(true);
      const { generateAIReview } = await import('../services/aiService');
      const aiText = await generateAIReview({
        clinicName: user?.clinicName || '',
        doctorName: user?.name || '',
        treatment: review.treatment || 'consultation',
        date: new Date(review.appointmentDate).toLocaleDateString(),
      });
      await updateReviewAiReviewText(review.id, aiText);
      review.aiReviewText = aiText; // mutate local reference for immediate modal use
      setSelectedReviewForAIEdit({ ...review });
      setShowAIReviewEditor(true);
    } catch (e) {
      console.error('Failed to generate AI review text before opening editor:', e);
      setErrorMessage(e instanceof Error ? e.message : 'Failed to generate AI review text');
    } finally {
      setIsGeneratingAIReview(false);
    }
  };

  const handleSaveAIReviewText = async (reviewId: string, text: string) => {
    try {
      await updateReviewAiReviewText(reviewId, text);
      // Update local selected review state
      if (selectedReviewForAIEdit && selectedReviewForAIEdit.id === reviewId) {
        selectedReviewForAIEdit.aiReviewText = text; // mutate local reference used only within component state
      }
    } catch (e) {
      console.error('Failed to save AI review text:', e);
      throw e;
    }
  };

  const handleSaveAndQueueAISuggestion = async (review: typeof reviews[0]) => {
    if (!review) return;
    setIsQueuingAISuggestion(true);
    setErrorMessage('');
    setSuccessMessage('');
    try {
      // Queue the ai_second message (uses existing stored aiReviewText)
      await queueReviewMessageForSheet(review, 'ai_second');
      setSuccessMessage('AI review suggestion has been queued to Google Sheets.');
      setShowAIReviewEditor(false);
      setSelectedReviewForAIEdit(null);
    } catch (e) {
      console.error('Failed to queue AI review suggestion:', e);
      setErrorMessage(e instanceof Error ? e.message : 'Failed to queue AI review suggestion');
    } finally {
      setIsQueuingAISuggestion(false);
    }
  };

  // --- Review Editing Handlers ---
  const handleOpenEditReview = (review: typeof reviews[0]) => {
    setSelectedReviewForEdit(review);
    setShowEditReviewModal(true);
  };

  const handleDeleteReview = async (review: typeof reviews[0]) => {
    try {
      await deleteReview(review.id);
      setSuccessMessage(`Review for ${review.patientName} has been deleted.`);
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      console.error('Error deleting review:', error);
      setErrorMessage('Failed to delete review. Please try again.');
      setTimeout(() => setErrorMessage(''), 5000);
    }
  };

  const handleSaveReviewEdits = async (
    id: string,
    updates: Partial<Pick<typeof reviews[0], 'patientName' | 'appointmentDate' | 'contactNumber' | 'treatment' | 'notes'>>
  ) => {
    try {
      await updateReviewFields(id, updates as any);
      // Optimistically update currently selected review for edit
      setSelectedReviewForEdit(prev => (prev && prev.id === id ? { ...prev, ...updates } : prev));
    } catch (e) {
      console.error('Failed to save review edits:', e);
      throw e;
    }
  };

  const handleSendSelectedMessages = async (messageTypes: string[]) => {
    if (!selectedReviewForMessages || messageTypes.length === 0) return;

    setIsSendingMessages(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      let successCount = 0;
      const errors: string[] = [];

      for (const messageType of messageTypes) {
        try {
          await queueReviewMessageForSheet(selectedReviewForMessages, messageType as any);
          
          // If this was an AI message that generated review text, we should update it
          // Note: queueReviewMessageForSheet internally calls generateReviewMessageContent
          // but doesn't return the aiReviewText. For now, we'll let the direct send handle persistence.
          
          successCount++;
        } catch (error) {
          console.error(`Error sending ${messageType}:`, error);
          errors.push(`${messageType}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      if (successCount > 0) {
        setSuccessMessage(`Successfully queued ${successCount} message${successCount > 1 ? 's' : ''} for ${selectedReviewForMessages.patientName}.`);
      }

      if (errors.length > 0) {
        setErrorMessage(`Some messages failed to queue: ${errors.join(', ')}`);
      }

    } catch (error) {
      console.error('Error sending selected messages:', error);
      setErrorMessage('Failed to send messages. Please try again.');
    } finally {
      setIsSendingMessages(false);
      setShowSendMessagesModal(false);
      setSelectedReviewForMessages(null);
    }
  };

  const handleDirectSendSelectedMessages = async (messageTypes: string[]) => {
    if (!selectedReviewForMessages || messageTypes.length === 0) return;

    setIsDirectSendingMessages(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      // Check if Blueticks API key is configured
      if (!user?.blueticksApiKey) {
        throw new Error('Blueticks API key not configured. Please add your API key in Settings first.');
      }

      let successCount = 0;
      const errors: string[] = [];

      for (const messageType of messageTypes) {
        try {
          // Generate message content using the utility function
          const result = await generateReviewMessageContent({
            review: selectedReviewForMessages,
            messageType: messageType as any,
            user,
            reviewRequestTemplates
          });

          // If AI review text was generated, save it to the database
          if (result.aiReviewText) {
            await updateReviewAiReviewText(selectedReviewForMessages.id, result.aiReviewText);
          }

          // Send via Blueticks API
          const response = await fetch("https://api.blueticks.co/messages", {
            method: "POST",
            headers: { 
              "content-type": "application/json" 
            },
            body: JSON.stringify({
              apiKey: user.blueticksApiKey,
              to: `+91${selectedReviewForMessages.contactNumber}`,
              message: result.messageContent,
            }),
          });

          if (response.ok) {
            successCount++;
            
            // Update AI review first message status if this was the first AI message
            if (messageType === 'ai_first') {
              await updateReviewAiFirstMessageStatus(selectedReviewForMessages.id, true);
            }
          } else {
            const error = await response.text();
            errors.push(`${messageType}: ${error}`);
          }
        } catch (error) {
          console.error(`Error sending ${messageType}:`, error);
          errors.push(`${messageType}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      if (successCount > 0) {
        setSuccessMessage(`Successfully sent ${successCount} message${successCount > 1 ? 's' : ''} directly to ${selectedReviewForMessages.patientName}.`);
      }

      if (errors.length > 0) {
        setErrorMessage(`Some messages failed to send: ${errors.join(', ')}`);
      }

    } catch (error) {
      console.error('Error sending selected messages directly:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Failed to send messages directly. Please try again.');
    } finally {
      setIsDirectSendingMessages(false);
      setShowSendMessagesModal(false);
      setSelectedReviewForMessages(null);
    }
  };

  // Removed individual send helpers (now handled via modal / unified handlers) to reduce unused code warnings

  const handleCreateSequenceMessages = async (review: typeof reviews[0]) => {
    try {
      // Refresh sequence templates first
      await fetchSequenceTemplates();
      
      if (review.hasSequence) {
        alert('Sequence messages have already been created for this review.');
        return;
      }

      // Validate clinic information
      if (!user?.clinicName || !user?.contactPhone) {
        alert('Clinic information is missing. Please update clinic settings first.');
        return;
      }

      // Validate visit date
      const visitDate = new Date(review.appointmentDate);
      if (!isValidDate(visitDate)) {
        alert('Invalid visit date. Please try again.');
        return;
      }

      // Set the selected review and show the modal
      setSelectedReviewForSequence(review);
      setShowSequenceOptionsModal(true);
    } catch (error) {
      console.error('Error preparing sequence creation:', error);
      alert('Failed to prepare sequence creation. Please try again.');
    }
  };

  // Bulk selection handlers
  const handleSelectReview = (reviewId: string, checked: boolean) => {
    const newSelected = new Set(selectedReviewIds);
    if (checked) {
      newSelected.add(reviewId);
    } else {
      newSelected.delete(reviewId);
    }
    setSelectedReviewIds(newSelected);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allIds = new Set(reviews.map(r => r.id));
      setSelectedReviewIds(allIds);
    } else {
      setSelectedReviewIds(new Set());
    }
  };

  const handleBulkCreateSequence = () => {
    console.log('[BULK SEQUENCE] Button clicked, selectedReviewIds:', selectedReviewIds);
    
    if (selectedReviewIds.size === 0) {
      setErrorMessage('Please select at least one review to create sequences.');
      return;
    }
    
    // Filter reviews to get the actual selected reviews
    const selectedReviews = reviews.filter(r => selectedReviewIds.has(r.id));
    console.log('[BULK SEQUENCE] Selected reviews:', selectedReviews);
    console.log('[BULK SEQUENCE] Selected review count:', selectedReviews.length);
    
    if (selectedReviews.length === 0) {
      setErrorMessage('No valid reviews found for the selected IDs.');
      return;
    }
    
    // Refresh sequence templates before showing modal
    console.log('[BULK SEQUENCE] Fetching sequence templates...');
    fetchSequenceTemplates()
      .then(() => {
        console.log('[BULK SEQUENCE] Templates fetched successfully, opening modal');
        
        if (selectedReviews.length === 1) {
          // Single review - use existing SequenceOptionsModal
          console.log('[BULK SEQUENCE] Single review selected, opening SequenceOptionsModal');
          setSelectedReviewForSequence(selectedReviews[0]);
          setShowSequenceOptionsModal(true);
        } else {
          // Multiple reviews - use new BulkCreateSequenceModal
          console.log('[BULK SEQUENCE] Multiple reviews selected, opening BulkCreateSequenceModal');
          console.log('[BULK SEQUENCE] showBulkCreateSequenceModal state before setting:', showBulkCreateSequenceModal);
          setShowBulkCreateSequenceModal(true);
          console.log('[BULK SEQUENCE] showBulkCreateSequenceModal state after setting:', true);
        }
      })
      .catch((error) => {
        console.error('[BULK SEQUENCE] Error fetching templates:', error);
        setErrorMessage('Failed to load sequence templates. Please try again.');
      });
  };

  const createBulkSequenceMessages = async (reviewsList: typeof reviews, profileType: string, language: string) => {
    if (!user) {
      throw new Error('User not authenticated');
    }

    // Validate clinic information
    if (!user.clinicName || !user.contactPhone) {
      throw new Error('Clinic information is missing. Please update clinic settings first.');
    }

    // Get templates for the selected profile type and language
    const selectedTemplates = sequenceTemplates.filter(t => 
      t.profileType === profileType && t.language === language
    );

    if (selectedTemplates.length === 0) {
      throw new Error(`No templates found for ${profileType} profile in ${LANGUAGE_NAMES[language] || language}. Please contact support.`);
    }

    let successCount = 0;
    let skipCount = 0;
    const errors: string[] = [];

  for (const review of reviewsList) {
      try {
        // Skip if already has sequence
        if (review.hasSequence) {
          skipCount++;
          continue;
        }

        const visitDate = new Date(review.appointmentDate);
        if (!isValidDate(visitDate)) {
          errors.push(`${review.patientName}: Invalid visit date`);
          continue;
        }

        // Create sequence messages for this review
        for (const template of selectedTemplates) {
          const randomizedDays = getRandomizedSequenceDays(template.sequenceDays);
          const scheduledDate = addDays(visitDate, randomizedDays);
          
          const messageContent = template.messageTemplate
            .replace(/{patient_name}/g, review.patientName)
            .replace(/{clinic_name}/g, user.clinicName || '')
            .replace(/{clinic_phone}/g, user.contactPhone || '');

          const message = {
            id: crypto.randomUUID(),
            profileId: review.id,
            patientName: review.patientName,
            whatsappNumber: review.contactNumber,
            scheduledDate: format(scheduledDate, 'yyyy-MM-dd'),
            messageContent,
            status: 'pending' as const,
            createdAt: new Date().toISOString(),
          };

          await addSequenceMessage(message);
        }

        // Update the review's has_sequence flag
        await updateReviewStatus(review.id, review.status, true);
        successCount++;

      } catch (error) {
        console.error(`Error creating sequence for ${review.patientName}:`, error);
        errors.push(`${review.patientName}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // Prepare result message
    let resultMessage = '';
    if (successCount > 0) {
      resultMessage += `Successfully created sequences for ${successCount} patient${successCount > 1 ? 's' : ''}`;
    }
    if (skipCount > 0) {
      if (resultMessage) resultMessage += '. ';
      resultMessage += `Skipped ${skipCount} patient${skipCount > 1 ? 's' : ''} (already have sequences)`;
    }
    if (errors.length > 0) {
      if (resultMessage) resultMessage += '. ';
      resultMessage += `Errors: ${errors.join(', ')}`;
    }

    if (successCount === 0 && errors.length > 0) {
      throw new Error(resultMessage);
    }

    return resultMessage;
  };

  const confirmBulkCreateSequence = async (profileType: string, language: string) => {
    const selectedReviews = reviews.filter(r => selectedReviewIds.has(r.id));
    
    if (selectedReviews.length === 0) {
      setErrorMessage('No reviews selected for bulk sequence creation.');
      return;
    }

    setIsCreatingBulkSequence(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      console.log('[BULK SEQUENCE] Creating sequences for reviews:', selectedReviews.map(r => r.patientName));
      const resultMessage = await createBulkSequenceMessages(selectedReviews, profileType, language);
      
      setSuccessMessage(resultMessage);
      
      // Clear selection after successful creation
      setSelectedReviewIds(new Set());
      setShowBulkCreateSequenceModal(false);
      
      // Refresh data
      await Promise.all([
        lazyLoadReviews(),
        fetchSequenceMessages()
      ]);
      
    } catch (error) {
      console.error('[BULK SEQUENCE] Error creating bulk sequences:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Failed to create sequences for selected reviews.');
    } finally {
      setIsCreatingBulkSequence(false);
    }
  };

  const handleToggleStatus = async (reviewId: string, newStatus: any) => {
    try {
      await updateReviewStatus(reviewId, newStatus);
    } catch (error) {
      console.error('Error updating review status:', error);
      alert('Failed to update status. Please try again.');
    }
  };

  const confirmCreateSequenceMessages = async (profileType: string, language: string) => {
    if (!selectedReviewForSequence || !user) {
      console.error('Missing selectedReviewForSequence or user');
      return;
    }

    try {
      console.log('[SINGLE SEQUENCE] Creating sequence messages for review:', selectedReviewForSequence.id, 'hasSequence before:', selectedReviewForSequence.hasSequence);
      
      // Get templates for the selected profile type and language
      const selectedTemplates = sequenceTemplates.filter(t => 
        t.profileType === profileType && t.language === language
      );

      if (selectedTemplates.length === 0) {
        alert(`No templates found for ${profileType} profile in ${LANGUAGE_NAMES[language] || language}. Please contact support or create templates first.`);
        return;
      }

      const visitDate = new Date(selectedReviewForSequence.appointmentDate);
      let createdCount = 0;

      // Create sequence messages with randomized dates
      for (const template of selectedTemplates) {
        try {
          const randomizedDays = getRandomizedSequenceDays(template.sequenceDays);
          const scheduledDate = addDays(visitDate, randomizedDays);
          
          const messageContent = template.messageTemplate
            .replace(/{patient_name}/g, selectedReviewForSequence.patientName || '')
            .replace(/{clinic_name}/g, user.clinicName || '')
            .replace(/{clinic_phone}/g, user.contactPhone || '');

          const message = {
            id: crypto.randomUUID(),
            profileId: selectedReviewForSequence.id,
            patientName: selectedReviewForSequence.patientName,
            whatsappNumber: selectedReviewForSequence.contactNumber,
            scheduledDate: format(scheduledDate, 'yyyy-MM-dd'),
            messageContent,
            status: 'pending' as const,
            createdAt: new Date().toISOString(),
          };

          await addSequenceMessage(message);
          createdCount++;
        } catch (error) {
          console.error('Error creating sequence message:', error);
          throw error;
        }
      }

      // Update the review's has_sequence flag
      console.log('[SINGLE SEQUENCE] About to update review status with hasSequence = true');
      await updateReviewStatus(selectedReviewForSequence.id, selectedReviewForSequence.status, true);
      
      // Fetch updated reviews to refresh the state
      await fetchReviews();
      
      // Fetch updated sequence messages
      await fetchSequenceMessages();
      
      alert(`Created ${createdCount} sequence message${createdCount > 1 ? 's' : ''} for ${profileType} profile in ${LANGUAGE_NAMES[language] || language}.`);
    } catch (error) {
      console.error('[SINGLE SEQUENCE] Error creating sequence messages:', error);
      alert('Failed to create sequence messages. Please try again.');
    }
  };

  // Get available profile types and languages
  // Note: Profile types and languages are now handled internally by SequenceOptionsModal

  // Calculate selection states
  const allSelected = reviews.length > 0 && reviews.every(r => selectedReviewIds.has(r.id));
  const someSelected = reviews.some(r => selectedReviewIds.has(r.id)) && !allSelected;
  const eligibleForSequence = reviews.filter(r => !r.hasSequence);
  const selectedEligibleCount = eligibleForSequence.filter(r => selectedReviewIds.has(r.id)).length;

  return (
    <div className="space-y-6">
      {/* Page Header with WhatsApp Status */}
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <Star className="h-8 w-8 text-green-600 mr-3" />
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Review Requests</h1>
            <p className="text-gray-600">Create AI-powered review requests and send to patients</p>
          </div>
        </div>
        <WhatsAppStatusIndicator showLabel={true} size="sm" />
      </div>

      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-medium mb-4">New Review Request</h2>
        
        {/* Success Message */}
        {successMessage && (
          <div className="mb-4 rounded-md bg-green-50 p-4">
            <div className="text-sm text-green-700">{successMessage}</div>
          </div>
        )}
        
        {/* Error Message */}
        {errorMessage && (
          <div className="mb-4 rounded-md bg-red-50 p-4">
            <div className="text-sm text-red-700">{errorMessage}</div>
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Patient Name</label>
              <input
                type="text"
                required
                className="mt-1 block w-full rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                value={formData.patientName}
                onChange={(e) => setFormData({ ...formData, patientName: toTitleCase(e.target.value) })}
                placeholder="Enter patient name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Date</label>
              <input
                type="date"
                required
                className="mt-1 block w-full rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                value={formData.appointmentDate}
                onChange={(e) => setFormData({ ...formData, appointmentDate: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Contact Number</label>
              <input
                type="tel"
                required
                pattern="[0-9]{10}"
                maxLength={10}
                placeholder="10 digit number"
                className="mt-1 block w-full rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                value={formData.contactNumber}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '').slice(0, 10);
                  setFormData({ ...formData, contactNumber: value });
                }}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Treatment/Service</label>
              <input
                type="text"
                className="mt-1 block w-full rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                placeholder="e.g., Consultation, Physical Therapy, Dental Cleaning"
                value={formData.treatment}
                onChange={(e) => setFormData({ ...formData, treatment: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Additional Notes</label>
              <input
                type="text"
                className="mt-1 block w-full rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              />
            </div>
          </div>
          <div className="flex justify-end">
            <button
              type="submit"
              className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700"
            >
              Create Review Request
            </button>
          </div>
        </form>
      </div>

      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-medium text-gray-900">Review Requests</h2>
          <div className="flex items-center space-x-4">
            {selectedReviewIds.size > 0 && (
              <button
                onClick={handleBulkCreateSequence}
                disabled={isCreatingBulkSequence || selectedEligibleCount === 0}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                title={selectedEligibleCount === 0 ? 'No eligible reviews selected (sequences already exist)' : `Create sequences for ${selectedEligibleCount} selected reviews`}
              >
                {isCreatingBulkSequence ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Creating...
                  </>
                ) : (
                  <>
                    <Clock className="h-4 w-4 mr-2" />
                    Create Sequence ({selectedEligibleCount})
                  </>
                )}
              </button>
            )}
            <div className="text-sm text-gray-500">
              {selectedReviewIds.size > 0 && `${selectedReviewIds.size} selected • `}
              {reviews.length} total • {reviews.filter(r => r.status === 'pending').length} pending
            </div>
          </div>
        </div>
        
        {/* Mobile/Tablet Card View */}
        <div className="block lg:hidden space-y-4">
          {isLoadingReviews ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
              <span className="ml-2 text-gray-600">Loading reviews...</span>
            </div>
          ) : (
          reviews.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <MessageCircle className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p>No review requests found.</p>
              <p className="text-sm">Create your first request above to get started.</p>
            </div>
          ) : (
            reviews.map((review) => (
              <ReviewCard
                key={review.id}
                review={review}
                onOpenSendMessagesModal={handleOpenSendMessagesModal}
                onCreateFollowup={() => handleCreateSequenceMessages(review)}
                onToggleStatus={handleToggleStatus}
                hasGMBLink={!!user?.gmbLink}
                isValidDate={isValidDate}
                isLoadingTemplates={isLoadingReviewRequestTemplates}
                hasTemplates={reviewRequestTemplates.length > 0}
                onEditAIReview={handleOpenAIReviewEditor}
                onEditReview={handleOpenEditReview}
                onDeleteReview={handleDeleteReview}
              />
            ))
          )
          )}
        </div>

        {/* Desktop Table View */}
        <div className="hidden lg:block">
          {isLoadingReviews ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
              <span className="ml-2 text-gray-600">Loading reviews...</span>
            </div>
          ) : (
          reviews.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <MessageCircle className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p>No review requests found.</p>
              <p className="text-sm">Create your first request above to get started.</p>
            </div>
          ) : (
            <table className="reviews-table min-w-full divide-y divide-gray-200">
              <colgroup>
                <col style={{ width: '50px' }} /> {/* Selection checkbox column */}
                <col style={{ width: '25%' }} /> {/* Patient */}
                <col style={{ width: '15%' }} /> {/* Date */}
                <col style={{ width: '35%' }} /> {/* Treatment / Notes */}
                <col style={{ width: '10%' }} /> {/* Status */}
                <col style={{ width: '22%' }} /> {/* Actions (expanded to show multiple buttons) */}
              </colgroup>
              <thead>
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-12">
                    <button
                      onClick={() => handleSelectAll(!allSelected)}
                      className="flex items-center justify-center w-full h-full"
                      title={allSelected ? 'Deselect all' : 'Select all'}
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
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Patient
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Treatment/Notes
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {reviews.map((review) => (
                  <tr 
                    key={review.id} 
                    className={`transition-colors hover:bg-gray-50 ${
                      review.status === 'pending' ? 'bg-yellow-50' : ''
                    }`}
                  >
                    <td className="px-6 py-4 text-sm">
                      <button
                        onClick={() => handleSelectReview(review.id, !selectedReviewIds.has(review.id))}
                        className="flex items-center justify-center w-full h-full"
                        title={selectedReviewIds.has(review.id) ? 'Deselect review' : 'Select review'}
                      >
                        {selectedReviewIds.has(review.id) ? (
                          <CheckSquare className="h-4 w-4 text-indigo-600" />
                        ) : (
                          <Square className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                        )}
                      </button>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 wrap">
                      {review.patientName || 'Unknown Patient'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {isValidDate(review.appointmentDate)
                        ? format(new Date(review.appointmentDate), 'PP')
                        : 'N/A'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 wrap">
                      {review.treatment && <span className="font-medium">{review.treatment}</span>}
                      {review.treatment && review.notes && <span className="mx-1">-</span>}
                      {review.notes}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <InteractiveStatusBadge review={review} onToggleStatus={handleToggleStatus} />
                    </td>
                    <td className="px-6 py-4 text-sm actions-cell">
                      <div className="flex flex-wrap items-center gap-2">
                        {/* Primary Action Button */}
                        {!review.aiReviewFirstMessageSent ? (
                          <button
                            onClick={() => handleOpenSendMessagesModal(review)}
                            className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 transition-colors shadow-sm"
                            title="Open message sending dialog"
                          >
                            <MessageCircle className="w-4 h-4 mr-2" />
                            Send Messages
                          </button>
                        ) : (
                          <button
                            onClick={() => handleOpenSendMessagesModal(review)}
                            className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 transition-colors shadow-sm"
                            title="Open message sending dialog"
                          >
                            <MessageCircle className="w-4 h-4 mr-2" />
                            Send Messages
                          </button>
                        )}
                        {/* New visible Edit button */}
                        <button
                          onClick={() => handleOpenEditReview(review)}
                          className="inline-flex items-center px-3 py-1 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 transition-colors shadow-sm"
                          title="Edit patient & visit details"
                        >
                          <Pencil className="w-4 h-4 mr-1" />
                          Edit
                        </button>
                        
                        {/* More Actions Dropdown */}
                        <ReviewActionsDropdown
                          review={review}
                          onOpenSendMessagesModal={handleOpenSendMessagesModal}
                          onCreateFollowup={() => handleCreateSequenceMessages(review)}
                          hasGMBLink={!!user?.gmbLink}
                          isLoadingTemplates={isLoadingReviewRequestTemplates}
                          hasTemplates={reviewRequestTemplates.length > 0}
                          onEditAIReview={handleOpenAIReviewEditor}
                          onEditReview={handleOpenEditReview}
                          onDeleteReview={handleDeleteReview}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
          )}
        </div>
      </div>

      {/* Sequence Options Modal */}
      {showSequenceOptionsModal && selectedReviewForSequence && (
        <SequenceOptionsModal
          review={selectedReviewForSequence}
          onConfirm={confirmCreateSequenceMessages}
          onClose={() => {
            setShowSequenceOptionsModal(false);
            setSelectedReviewForSequence(null);
          }}
        />
      )}

      {/* Bulk Create Sequence Modal */}
      {showBulkCreateSequenceModal && (
        <BulkCreateSequenceModal
          reviews={reviews.filter(r => selectedReviewIds.has(r.id))}
          onConfirm={confirmBulkCreateSequence}
          onClose={() => {
            setShowBulkCreateSequenceModal(false);
            setSelectedReviewIds(new Set());
          }}
        />
      )}

      {/* Send Messages Modal */}
      <SendMessagesModal
        isOpen={showSendMessagesModal}
        onClose={() => {
          setShowSendMessagesModal(false);
          setSelectedReviewForMessages(null);
          // Refresh data after closing to reflect any queued messages or status updates
          lazyLoadReviews();
          fetchSequenceMessages();
        }}
        review={selectedReviewForMessages}
        onSend={handleSendSelectedMessages}
        hasGMBLink={!!user?.gmbLink}
        onDirectSend={handleDirectSendSelectedMessages}
        isLoading={isSendingMessages}
        isDirectSending={isDirectSendingMessages}
        isLoadingTemplates={isLoadingReviewRequestTemplates}
        hasTemplates={reviewRequestTemplates.length > 0}
        onEditAIReview={handleOpenAIReviewEditor}
        isGeneratingAIReview={isGeneratingAIReview}
      />

      {/* AI Review Editor Modal (global) */}
      <AIReviewEditorModal
        isOpen={showAIReviewEditor}
        onClose={() => { setShowAIReviewEditor(false); setSelectedReviewForAIEdit(null); }}
        review={selectedReviewForAIEdit}
        onSave={handleSaveAIReviewText}
        onQueueSuggestion={handleSaveAndQueueAISuggestion}
        isQueuing={isQueuingAISuggestion}
      />
      <EditReviewModal
        isOpen={showEditReviewModal}
        review={selectedReviewForEdit as any}
        onClose={() => { setShowEditReviewModal(false); setSelectedReviewForEdit(null); }}
        onSave={handleSaveReviewEdits}
      />
    </div>

  );
}